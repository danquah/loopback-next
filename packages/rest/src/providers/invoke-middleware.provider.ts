// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  config,
  CoreTags,
  extensionPoint,
  inject,
  Provider,
} from '@loopback/core';
import debugFactory from 'debug';
import {
  InvokeMiddleware,
  invokeMiddleware,
  InvokeMiddlewareOptions,
  MIDDLEWARE_EXTENSION_POINT,
} from '../middleware';
import {RequestContext} from '../request-context';
const debug = debugFactory('loopback:rest:middleware');

/**
 * Extension point for middleware to be run as part of the sequence actions
 */
@extensionPoint(MIDDLEWARE_EXTENSION_POINT)
export class InvokeMiddlewareProvider implements Provider<InvokeMiddleware> {
  /**
   * Inject the binding so that we can access `extensionPoint` tag
   */
  @inject.binding()
  protected binding: Binding<InvokeMiddleware>;

  /**
   * Default options for invoking the middleware chain
   */
  @config()
  protected defaultOptions: InvokeMiddlewareOptions = {
    extensionPoint: MIDDLEWARE_EXTENSION_POINT,
    orderedGroups: ['cors', 'apiSpec', ''],
  };

  value(): InvokeMiddleware {
    debug('Binding', this.binding);
    return (requestCtx, options) => {
      let extensionPointName = options?.extensionPoint;
      const orderedGroups = options?.orderedGroups;
      extensionPointName =
        extensionPointName ??
        this.binding?.tagMap[CoreTags.EXTENSION_POINT] ??
        this.defaultOptions.extensionPoint;
      return this.action(requestCtx, {
        extensionPoint: extensionPointName,
        orderedGroups: orderedGroups ?? this.defaultOptions.orderedGroups,
      });
    };
  }

  async action(requestCtx: RequestContext, options?: InvokeMiddlewareOptions) {
    return invokeMiddleware(requestCtx, options);
  }
}
