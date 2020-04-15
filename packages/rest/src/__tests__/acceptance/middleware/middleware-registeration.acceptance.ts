// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {spy, SpyConfig, TestFunction, TestHelper} from './test-helpers';

describe('app.expressMiddleware()', () => {
  let helper: TestHelper;

  function runTests(action: 'log' | 'mock' | 'reject', testFn: TestFunction) {
    describe(`app.middleware - ${action}`, () => {
      const spyConfig: SpyConfig = {action};
      beforeEach(givenTestApp);
      afterEach(() => helper?.stop());

      it('registers a middleware interceptor provider class by factory', () => {
        const binding = helper.app.expressMiddleware(spy, spyConfig);
        return testFn(binding);
      });

      it('registers a middleware interceptor as handler function', () => {
        const binding = helper.app.restServer.expressMiddleware(
          spy,
          spyConfig,
          {
            injectConfiguration: false,
            key: 'interceptors.middleware.spy',
          },
        );
        expect(binding.key).to.eql('interceptors.middleware.spy');
        return testFn(binding);
      });
    });
  }

  runTests('log', binding => helper.testSpyLog(binding));
  runTests('mock', binding => helper.testSpyMock(binding));
  runTests('reject', binding => helper.testSpyReject(binding));

  function givenTestApp() {
    helper = new TestHelper();
    helper.bindController();
    return helper.start();
  }
});
