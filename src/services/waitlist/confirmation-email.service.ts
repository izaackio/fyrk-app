export interface WaitlistConfirmationEmailPayload {
  email: string;
}

export interface WaitlistConfirmationEmailService {
  sendSignupConfirmation(payload: WaitlistConfirmationEmailPayload): Promise<void>;
}

class NoopWaitlistConfirmationEmailService implements WaitlistConfirmationEmailService {
  async sendSignupConfirmation(_payload: WaitlistConfirmationEmailPayload): Promise<void> {
    return;
  }
}

export const waitlistConfirmationEmailService: WaitlistConfirmationEmailService =
  new NoopWaitlistConfirmationEmailService();
