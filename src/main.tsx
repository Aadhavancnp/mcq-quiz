import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App.tsx";
import {AuthProvider} from "./auth/AuthContext.tsx";
import {BrowserRouter} from "react-router";
import "./index.css";
import {Toaster} from "@/components/ui/toaster.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App/>
                <Toaster/>
            </AuthProvider>
        </BrowserRouter>{" "}
    </StrictMode>
);
