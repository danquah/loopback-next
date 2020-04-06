# @loopback/extension-authentication-jwt

This module exports the jwt authentication strategy and its corresponding token
service as a component. You can mount the component to get a prototype token
based authentication system in your LoopBack 4 application.

## Usage

This module contains an example LoopBack 4 application in folder `fixtures`. It
contains:

- a `User` and a `UserCredentials` model.
- a user service that contains user utility functions like validating
  credentials.
  - tip: the user service is not extracted into the jwt component because it
    couples with model `User` and `UserCredentials`.
- a controller with endpoints `/login` and `/whoAmI`.

To mount the jwt component in the example, you can add this code in file
`application.ts`:

```ts
// Assume you already enabled the authentication system
// in the sequence and application file.
this.component(JWTAuthenticationComponent);

// You will find the current example has an extra function to
// merge the security spec into the application.
// This will be improved with a coming enhancer.
// See section [To Be Done](#to-be-done)
```

_All the jwt authentication related code are marked with comment "- enable jwt
auth -", you can search for it to find all the related code you need to enable
the entire jwt authentication in a LoopBack 4 application._

## To Be Done

The security specification is currently manually added in the application file.
The next step is to create an enhancer in the component to automatically bind
the spec when app starts.

## Contributions

- [Guidelines](https://github.com/strongloop/loopback-next/blob/master/docs/CONTRIBUTING.md)
- [Join the team](https://github.com/strongloop/loopback-next/issues/110)

## Tests

Run `npm test` from the root folder.

## Contributors

See
[all contributors](https://github.com/strongloop/loopback-next/graphs/contributors).

## License

MIT
