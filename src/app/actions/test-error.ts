"use server";

import { handleError } from "@/lib/utils/error-handler";
import { getSession } from "@/lib/auth/session";

export async function simulateBackendError() {
  try {
    // Código propositalmente quebrado no lado do servidor
    const fakeData: any = null;
    fakeData.profile.firstName.toUpperCase();
  } catch (error) {
    const session = await getSession();
    await handleError(error, "Botão Testar Crachá (Backend)", { 
      loggedUser: session?.username 
    });
  }
}
