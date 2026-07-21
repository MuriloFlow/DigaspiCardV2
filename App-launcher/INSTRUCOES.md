# Gerador de Aplicativos Digaspi (Mobile e Desktop)

Aqui estão os códigos originais para gerar seus aplicativos verdadeiros (.exe para Windows, e APK para Android / iOS).
Como este aplicativo é um **WebView wrapper** hiper-otimizado (ele espelha perfeitamente o site em tempo real), **você NÃO precisa de atualizações de App**. 

Sempre que você commitar e a Vercel atualizar o site, **todos os aplicativos instalados nos celulares e computadores são atualizados instantaneamente na hora**, porque eles leem direto da Vercel! Super automático!

## 1. Aplicativo Desktop (Windows .exe / Mac / Linux)
Na pasta `Desktop`, nós configuramos o motor Electron. Ele criará o instalador executável limpo (sem bordas do navegador) para PC.

**Como construir o seu `.exe`:**
1. Abra o terminal e navegue até a pasta: `cd App-launcher/Desktop`
2. Instale as dependências: `npm install`
3. Gere o instalador para Windows: `npm run build:windows`
O seu `.exe` mágico aparecerá dentro da pasta `dist/` gerada lá dentro. Basta subir ele pro seu site `/baixar`!

## 2. Aplicativo Mobile (Android .apk / iOS)
Na pasta `Mobile`, configuramos o motor React Native com Expo.

**Como construir o seu `.apk`:**
1. Instale o aplicativo **Expo Go** no seu celular para testar.
2. No terminal: `cd App-launcher/Mobile`
3. Rode `npm install` e depois `npm start`. Leia o QR Code no seu celular para ver rodando igual a um App!
4. Para baixar o arquivo `.apk` final para distribuir:
   - Crie uma conta em expo.dev
   - Rode no terminal: `npx eas-cli build -p android --profile preview`
   - O Expo vai construir o app na nuvem dele de graça e te dará um link direto pra baixar o arquivo `.apk`!
