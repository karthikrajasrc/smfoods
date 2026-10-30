interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    context?: "signin" | "signup" | "use";
    ux_mode?: "popup";
  }): void;
  renderButton(element: HTMLElement, options: {
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    shape?: "rectangular" | "pill" | "circle" | "square";
    width?: number;
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  }): void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleIdentity;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
