// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  BindingScope,
  BindingTemplate,
  compareBindingsByTag,
  Constructor,
  Context,
  createBindingFromClass,
  isProviderClass,
  Provider,
} from '@loopback/context';
import {extensionFilter, extensionFor} from '@loopback/core';
import assert from 'assert';
import debugFactory from 'debug';
import {RequestContext} from '../request-context';
import {
  buildName,
  createInterceptor,
  defineInterceptorProvider,
} from './middleware-interceptor';
import {
  ExpressMiddlewareFactory,
  InvokeMiddlewareOptions,
  Middleware,
  MiddlewareBindingOptions,
  MiddlewareChain,
} from './types';

const debug = debugFactory('loopback:rest:middleware');

/**
 * Create a LoopBack middleware from Express middleware
 *
 * @param middlewareFactory - Express middleware factory function
 * @param middlewareConfig - Express middleware config
 *
 * @returns A LoopBack middleware function that wraps the Express middleware
 */
export function createMiddleware<CFG>(
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  middlewareConfig?: CFG,
): Middleware {
  const middleware: Middleware = createInterceptor(
    middlewareFactory,
    middlewareConfig,
  );
  return middleware;
}

/**
 * Bind a Express middleware to the given context
 *
 * @param ctx - Context object
 * @param middlewareFactory - Middleware module name or factory function
 * @param middlewareConfig - Middleware config
 * @param options - Options for registration
 *
 * @typeParam CFG - Configuration type
 */
export function registerExpressMiddleware<CFG>(
  ctx: Context,
  middlewareFactory: ExpressMiddlewareFactory<CFG>,
  middlewareConfig?: CFG,
  options: MiddlewareBindingOptions = {},
): Binding<Middleware> {
  options = {injectConfiguration: true, ...options};
  options.extensionPointName =
    options.extensionPointName ?? MIDDLEWARE_EXTENSION_POINT;
  if (!options.injectConfiguration) {
    let key = options.key;
    if (!key) {
      const name = buildName(middlewareFactory);
      if (name) key = `interceptors.${name}`;
    }
    const middleware = createMiddleware(middlewareFactory, middlewareConfig);
    return registerMiddleware(ctx, middleware, options);
  }

  const providerClass = defineInterceptorProvider<CFG, RequestContext>(
    middlewareFactory,
    options.providerClassName,
  );
  const binding = registerMiddleware(ctx, providerClass, options);
  if (middlewareConfig != null) {
    ctx.configure(binding.key).to(middlewareConfig);
  }
  return binding;
}

/**
 * Template function for middleware bindings
 * @param options - Options to configure the binding
 */
export function asMiddleware(
  options: MiddlewareBindingOptions = {},
): BindingTemplate<Middleware> {
  return function middlewareBindingTemplate(binding) {
    binding
      .apply(
        extensionFor(options.extensionPointName ?? MIDDLEWARE_EXTENSION_POINT),
      )
      .tag({group: options.group ?? ''});
  };
}

/**
 * Bind the middleware function or provider class to the context
 * @param ctx - Context object
 * @param middleware - Middleware function or provider class
 * @param options - Middleware binding options
 */
export function registerMiddleware(
  ctx: Context,
  middleware: Middleware | Constructor<Provider<Middleware>>,
  options: MiddlewareBindingOptions,
) {
  if (isProviderClass(middleware as Constructor<Provider<Middleware>>)) {
    const binding = createMiddlewareBinding(
      middleware as Constructor<Provider<Middleware>>,
      options,
    );
    ctx.add(binding);
    return binding;
  }
  assert(options.key, 'options.key is missing.');
  return ctx
    .bind(options.key!)
    .to(middleware as Middleware)
    .apply(asMiddleware(options));
}

/**
 * Create a binding for the middleware provider class
 *
 * @param middleware - Middleware provider class
 * @param options - Options to create middleware binding
 *
 */
export function createMiddlewareBinding(
  middlewareProviderClass: Constructor<Provider<Middleware>>,
  options: MiddlewareBindingOptions = {},
) {
  options = {injectConfiguration: true, ...options};
  options.extensionPointName =
    options.extensionPointName ?? MIDDLEWARE_EXTENSION_POINT;
  const binding = createBindingFromClass(middlewareProviderClass, {
    defaultScope: BindingScope.TRANSIENT,
    namespace: 'middleware',
    key: options.key,
  }).apply(asMiddleware(options));
  return binding;
}

/**
 * Default extension point name for middleware
 */
export const MIDDLEWARE_EXTENSION_POINT = 'middleware.defaultChain';

/**
 * Discover and invoke registered middleware in a chain for the given extension
 * point.
 *
 * @param requestCtx - Request context
 * @param options - Options to invoke the middleware chain
 */
export function invokeMiddleware(
  requestCtx: RequestContext,
  options?: InvokeMiddlewareOptions,
) {
  debug(
    'Invoke middleware chain for %s %s with options',
    requestCtx.request.method,
    requestCtx.request.originalUrl,
    options,
  );
  const {extensionPoint = MIDDLEWARE_EXTENSION_POINT, orderedGroups} =
    options ?? {};
  // Find extensions for the given extension point binding
  const filter = extensionFilter(extensionPoint);
  if (debug.enabled) {
    debug(
      'Middleware for extension point "%s":',
      extensionPoint,
      requestCtx.find(filter).map(b => b.key),
    );
  }
  const chain = new MiddlewareChain(
    requestCtx,
    filter,
    compareBindingsByTag('group', orderedGroups),
  );
  return chain.invokeInterceptors();
}
