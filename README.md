### ALL OAUTH PROJECT DEVELOPMENT

    sequenceDiagram
    participant User
    participant Client
    participant Backend as GraphQL Backend
    participant Google as Google OAuth
    participant RedirectHandler as Redirect Handler

    User->>Client: Initiate login
    Client->>Backend: GraphQL mutation: requestOAuthUrl
    Backend->>Google: Request OAuth URL
    Google-->>Backend: Return OAuth URL
    Backend-->>Client: Return OAuth URL
    Client->>User: Redirect to Google login
    User->>Google: Authenticate and authorize
    Google-->>RedirectHandler: Redirect with authorization code
    RedirectHandler->>Client: Redirect with code as parameter
    Client->>Backend: GraphQL mutation: exchangeOAuthCode
    Backend->>Google: Exchange code for tokens
    Google-->>Backend: Return access and refresh tokens
    Backend->>Google: Fetch user info with access token
    Google-->>Backend: Return user info
    Backend-->>Client: Return user info and session token
    Client->>User: Display logged-in state


