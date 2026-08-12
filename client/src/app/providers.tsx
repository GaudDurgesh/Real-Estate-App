"use client";

import Auth from "./(auth)/authProvider";
import StoreProvider from "@/state/redux";
import { Authenticator } from "@aws-amplify/ui-react";

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <Authenticator.Provider>
        <Auth>{children}</Auth>
      </Authenticator.Provider>
    </StoreProvider>
  );
};

export default Provider;
