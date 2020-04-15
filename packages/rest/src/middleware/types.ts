// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  BindingAddress,
  Context,
  GenericInterceptor,
  GenericInterceptorChain,
  InvocationContext,
  ValueOrPromise,
} from '@loopback/core';
import {RequestContext} from '../request-context';
import {ExpressRequestHandler} from '../router';

/**
 * Interface LoopBack 4 middleware to be executed within sequence of actions.
 * A middleware for LoopBack is basically a generic interceptor that uses
 * `RequestContext`.
 *
 * The signature of a middleware function is as follows. It's very much the same
 * as {@link https://github.com/koajs/koa/blob/master/docs/guide.md#writing-middleware | Koa middleware}.
 * ```ts
 * (context: RequestContext, next: Next) => ValueOrPromise<InvocationResult>;
 * ```
 *
 * @example
 * ```ts
 * const log: Middleware = async (requestCtx, next) => {
 *   const {request} = requestCtx;
 *   console.log('Request: %s %s', request.method, request.originalUrl);
 *   try {
 *     // Proceed with next middleware
 *     await next();
 *     console.log('Response received for %s %s', request.method, request.originalUrl);
 *   } catch(err) {
 *     console.error('Error received for %s %s', request.method, request.originalUrl);
 *     throw err;
 *   }
 * }
 * ```
 */
export interface Middleware extends GenericInterceptor<RequestContext> {}

/**
 * An interceptor chain of middleware. This represents a list of cascading
 * middleware functions to be executed by the order of `group` names.
 */
export class MiddlewareChain extends GenericInterceptorChain<RequestContext> {}

/**
 * Options for `InvokeMiddleware`
 */
export interface InvokeMiddlewareOptions {
  /**
   * Name of the extension point. Default to the `extensionPoint` tag value
   * from the binding
   */
  extensionPoint?: string;
  /**
   * An array of group names to denote the order of execution
   */
  orderedGroups?: string[];
}

/**
 * Interface for the invoker of middleware registered under the an extension
 * point name.
 */
export interface InvokeMiddleware {
  /**
   * Invoke the request interceptors in the chain.
   * @param requestCtx - Request Context
   * @param options - Options for the invocation
   */
  (
    requestCtx: RequestContext,
    options?: InvokeMiddlewareOptions,
  ): ValueOrPromise<unknown>;
}

export interface MiddlewareCreationOptions {
  /**
   * A flag to control if configuration for the middleware can be injected
   * lazily.
   *
   * - `true` (default): creates a provider class with `@config`
   * - `false`: creates a dynamic value that creates the middleware
   */
  injectConfiguration?: boolean;
  /**
   * Class name for the created provider class. It's only used if
   * `injectConfiguration` is not set to `false`.
   */
  providerClassName?: string;
}

/**
 * Options to create a middleware binding for the sequence action or interceptor.
 * @typeParam CTX - Context class
 */
export interface BaseMiddlewareBindingOptions<CTX extends Context>
  extends MiddlewareCreationOptions {
  /**
   * Binding key for the middleware.
   */
  key?: BindingAddress<GenericInterceptor<CTX>>;
  /**
   * An optional `group` name to be used for order of executions
   */
  group?: string;
}

/**
 * Options to bind a middleware as an interceptor to the context
 */
export interface MiddlewareInterceptorBindingOptions
  extends BaseMiddlewareBindingOptions<InvocationContext> {
  /**
   * A flag to control if the interceptor should be global. Default to `true`.
   */
  global?: boolean;
}

/**
 * Options to bind middleware as a request context based interceptor within an
 * `InvokeMiddleware` action of the sequence.
 */
export interface MiddlewareBindingOptions
  extends BaseMiddlewareBindingOptions<RequestContext> {
  /**
   * Name of the middleware extension point. Default to 'middleware'.
   */
  extensionPointName?: string;
}

/**
 * Interface for an express middleware factory
 * @typeParam C - Configuration type
 */
export interface ExpressMiddlewareFactory<C> {
  (middlewareConfig?: C): ExpressRequestHandler;
}
