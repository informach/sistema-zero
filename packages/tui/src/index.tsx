import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Header } from "./components/header";
import { InputBar } from "./components/input-bar";
import { KeyboardLayerProvider } from "./providers/keyboard-layer";
import { ThemeProvider } from "./providers/theme";

function App() {
  return (
    <ThemeProvider>
      <KeyboardLayerProvider>
        <box
          alignItems="center"
          justifyContent="center"
          backgroundColor="#0D0D12"
          width="100%"
          height="100%"
          gap={2}
        >
          <Header />
          <box width="100%" maxWidth={78} paddingX={2}>
            <InputBar onSubmit={() => {}} />
          </box>
        </box>
      </KeyboardLayerProvider>
    </ThemeProvider>
  );
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<App />);
