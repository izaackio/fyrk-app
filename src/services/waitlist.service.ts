import { createStatelessSupabaseClient } from "@/lib/auth/supabase";
import type { WaitlistSignupInput } from "@/lib/validations/waitlist";
import { waitlistConfirmationEmailService } from "@/services/waitlist/confirmation-email.service";

interface WaitlistSignupResult {
  message: string;
}

interface WaitlistSignupInsertRow {
  id: string;
}

export class WaitlistService {
  async signup(input: WaitlistSignupInput): Promise<WaitlistSignupResult> {
    const supabase = createStatelessSupabaseClient();
    const { data, error } = await supabase
      .from("waitlist_signups")
      .upsert(
        {
          email: input.email,
        },
        {
          onConflict: "email",
          ignoreDuplicates: true,
        },
      )
      .select("id");

    if (error) {
      throw error;
    }

    const insertedRows = (data ?? []) as WaitlistSignupInsertRow[];

    if (insertedRows.length > 0) {
      await waitlistConfirmationEmailService.sendSignupConfirmation({
        email: input.email,
      });
    }

    return {
      message: "Waitlist signup received",
    };
  }
}

export const waitlistService = new WaitlistService();
