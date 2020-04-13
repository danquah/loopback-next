// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-passport-login
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {AuthenticationStrategy, asAuthStrategy} from '@loopback/authentication';
import {StrategyAdapter} from '@loopback/authentication-passport';
import {Request, RedirectRoute} from '@loopback/rest';
import {UserProfile, securityId} from '@loopback/security';
import {User} from '../models';
import {bind} from '@loopback/context';
import {Strategy, IVerifyOptions} from 'passport-local';
import {repository} from '@loopback/repository';
import {UserRepository} from '../repositories';

@bind(asAuthStrategy)
export class LocalAuthStrategy implements AuthenticationStrategy {
  name = 'local';
  passportstrategy: Strategy;
  strategy: StrategyAdapter<User>;

  /**
   * create a local passport strategy
   */
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {
    /**
     * create a local passport strategy with verify function to validate credentials
     */
    this.passportstrategy = new Strategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        session: false,
      },
      this.verify.bind(this),
    );
    /**
     * wrap the passport strategy instance with an adapter to plugin to LoopBack authentication
     */
    this.strategy = new StrategyAdapter(
      this.passportstrategy,
      this.name,
      this.mapProfile.bind(this),
    );
  }

  /**
   * authenticate a request
   * @param request
   */
  async authenticate(request: Request): Promise<UserProfile | RedirectRoute> {
    return this.strategy.authenticate(request);
  }

  /**
   * authenticate user with provided username and password
   *
   * @param username
   * @param password
   * @param done
   *
   * @returns User model
   */
  verify(
    username: string,
    password: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    done: (error: any, user?: any, options?: IVerifyOptions) => void,
  ): void {
    this.userRepository
      .find({
        where: {
          email: username,
        },
        include: [
          {
            relation: 'profiles',
          },
        ],
      })
      .then(user => {
        if (!user || !user.length) {
          /**
           * Passport-local strategy fails authentication with third argument,
           * the first argument assumes an error in the authenticating process.
           */
          return done(null, null, {
            message: 'User Name / Password not matching',
          });
        }
        done(null, user[0]);
      })
      .catch(err => {
        /**
         * Error occurred in authenticating process.
         * Does not necessarily mean an unauthorized user.
         */
        done(err);
      });
  }

  /**
   * maps returned User model from verify function to UserProfile
   *
   * @param user
   */
  mapProfile(user: User): UserProfile {
    const userProfile: UserProfile = {
      [securityId]: '' + user.id,
      profile: {
        ...user,
      },
    };
    return userProfile;
  }
}
