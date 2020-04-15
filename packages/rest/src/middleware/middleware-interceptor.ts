// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  asGlobalInterceptor,
  BindingScope,
  config,
  Constructor,
  Context,
  ContextTags,
  createBindingFromClass,
  GenericInterceptor,
  Interceptor,
  InvocationContext,
  Provider,
} from '@loopback/core';
import assert from 'assert';
import debugFactory from 'debug';
import pEvent from 'p-event';
import {RestBindings} from '../keys';
import {RequestContext} from '../request-context';
import {ExpressRequestHandler} from '../router';
import {
  ExpressMiddlewareFactory,
  MiddlewareInterceptorBindingOptions,
} from './types';

const debug = debugFactory('loopback:rest:middleware');

/**
 * Wrap an express middleware handler function as an interceptor
 * @param handlerFn - Express middleware handler function
 *
 * @typeParam CTX - Context type
 */
export function toInterceptor<CTX extends Context = InvocationContext>(
  handlerFn: ExpressRequestHandler,
): GenericInterceptor<CTX> {
  return async (context, next) => {
    const requestCtx = await context.get<RequestContext>(
      RestBindings.Http.CONTEXT,
    );
    let toProceed = false;
    // Watch for `finished` event of the response. If it happens, the response
    // processing is done.
    const finishing = pEvent(requestCtx, 'close');
    const handling = new Promise((resolve, reject) => {
      handlerFn(requestCtx.request, requestCtx.response, err => {
        debug('[%s] Handler calling next()', handlerFn.name, err);
        if (err != null) {
          reject(err);
        } else {
          toProceed = true;
          resolve();
        }
      });
    });
    /**
     * Express middleware may handle the response by itself and not call
     * `next`. We use `Promise.race()` to determine if we need to proceed
     * with next interceptor in the chain or just return.
     */
    await Promise.race([handling, finishing]);
    if (toProceed) {
      debug('[%s] Proceed with downstream interceptors', handlerFn.name);
      const val = await next();
      debug(
        '[%s] Result received from downstream interceptors',
        handlerFn.name,
      );
      return val;
    }
    // Return response to indicate the response has been produced
    return requestCtx.response;
  };
}

/**
 * Create an interceptor function from express middleware.
 * @param middlewareFactory - Express middleware factory function. A wrapper
 * can be created if the Express middleware module does not conform to the
 * factory pattern and signature.
 * @param middlewareConfig - Configuration for the Express middleware
 *
 * @typeParam CFG - Configuration type
 * @typeParam CTX - Context type
 */
export function createInterceptor<CFG, CTX extends Context = InvocationContext>(
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  middlewareConfig?: CFG,
): GenericInterceptor<CTX> {
  const handlerFn = middlewareFactory(middlewareConfig);
  return toInterceptor(handlerFn);
}

/**
 * Base class for MiddlewareInterceptor provider classes
 *
 * @example
 * ```
 * class SpyInterceptorProvider extends ExpressMiddlewareInterceptorProvider<
 *   SpyConfig
 *   > {
 *     constructor(@config() spyConfig?: SpyConfig) {
 *       super(spy, spyConfig);
 *     }
 * }
 * ```
 *
 * @typeParam CFG - Configuration type
 */
export abstract class ExpressMiddlewareInterceptorProvider<CFG>
  implements Provider<Interceptor> {
  constructor(
    protected middlewareFactory: ExpressMiddlewareFactory<CFG>,
    protected middlewareConfig?: CFG,
  ) {}

  value() {
    return createInterceptor(this.middlewareFactory, this.middlewareConfig);
  }
}

/**
 * Define a provider class that wraps the middleware as an interceptor
 * @param middlewareFactory - Express middleware factory function
 * @param className - Class name for the generated provider class
 *
 * @typeParam CFG - Configuration type
 * @typeParam CTX - Context type
 */
export function defineInterceptorProvider<
  CFG,
  CTX extends Context = InvocationContext
>(
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  className?: string,
): Constructor<Provider<GenericInterceptor<CTX>>> {
  className = buildName(middlewareFactory, className);
  assert(className, 'className is missing and it cannot be inferred.');

  const defineNamedClass = new Function(
    'middlewareFactory',
    'MiddlewareInterceptorProvider',
    'createInterceptor',
    `return class ${className} extends MiddlewareInterceptorProvider {
       constructor(middlewareConfig) {
         super(middlewareFactory, middlewareConfig);
       }
       value() {
         return createInterceptor(this.middlewareFactory, this.middlewareConfig);
       }
     };`,
  );

  const cls = defineNamedClass(
    middlewareFactory,
    ExpressMiddlewareInterceptorProvider,
    createInterceptor,
  );
  config()(cls, '', 0);
  return cls;
}

/**
 * Build a name for the middleware
 * @param middlewareFactory - Express middleware factory function
 * @param providedName - Provided name
 * @param suffix - Suffix
 */
export function buildName<CFG>(
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  providedName?: string,
  suffix?: string,
) {
  if (!providedName) {
    let name = middlewareFactory.name;
    name = name.replace(/[^\w]/g, '_');
    if (name) {
      providedName = `${name}${suffix ?? ''}`;
    }
  }
  return providedName;
}

/**
 * Bind a middleware interceptor to the given context
 *
 * @param ctx - Context object
 * @param middlewareFactory - Express middleware factory function
 * @param middlewareConfig - Express middleware config
 * @param options - Options for registration
 *
 * @typeParam CFG - Configuration type
 */
export function registerExpressMiddlewareInterceptor<CFG>(
  ctx: Context,
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  middlewareConfig?: CFG,
  options: MiddlewareInterceptorBindingOptions = {},
) {
  options = {
    injectConfiguration: true,
    global: true,
    group: 'middleware',
    ...options,
  };
  if (!options.injectConfiguration) {
    let key = options.key;
    if (!key) {
      const name = buildName(middlewareFactory);
      if (name) key = `interceptors.${name}`;
    }
    assert(key, 'Please set options.key for the binding.');
    const binding = ctx
      .bind(key!)
      .to(createInterceptor(middlewareFactory, middlewareConfig));
    if (options.global) {
      binding.tag({[ContextTags.GLOBAL_INTERCEPTOR_SOURCE]: 'route'});
      binding.apply(asGlobalInterceptor(options.group));
    }
    return binding;
  }
  const providerClass = defineInterceptorProvider(
    middlewareFactory,
    options.providerClassName,
  );
  const binding = createMiddlewareInterceptorBinding<CFG>(
    providerClass,
    options,
  );
  ctx.add(binding);
  if (middlewareConfig != null) {
    ctx.configure(binding.key).to(middlewareConfig);
  }
  return binding;
}

/**
 * Create a binding for the middleware based interceptor
 *
 * @param middlewareProviderClass - Middleware provider class
 * @param options - Options to create middlewareFactory interceptor binding
 *
 * @typeParam CFG - Configuration type
 */
export function createMiddlewareInterceptorBinding<CFG>(
  middlewareProviderClass: Constructor<Provider<Interceptor>>,
  options: MiddlewareInterceptorBindingOptions = {},
) {
  options = {
    global: true,
    group: 'middleware',
    ...options,
  };
  const binding = createBindingFromClass(middlewareProviderClass, {
    defaultScope: BindingScope.TRANSIENT,
    namespace: 'interceptors',
  });
  if (options.global) {
    binding.tag({[ContextTags.GLOBAL_INTERCEPTOR_SOURCE]: 'route'});
    binding.apply(asGlobalInterceptor(options.group));
  }
  return binding;
}
