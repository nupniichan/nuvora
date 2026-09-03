# Nuvora

Nuvora is a private-first personal finance app built with Expo and React Native. Financial data stays on the device, with encrypted backup and restore support.

## Development

```bash
npm install
npm run start
```

Useful checks:

```bash
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
```

The app targets Expo SDK 57 and supports Vietnamese and English.

## Security notes

- Native databases require a development build with SQLCipher enabled; Expo Go is not supported for the encrypted database path.
- The master password is never stored directly.
- Biometric unlock stores the active data-encryption key in platform-protected secure storage.
- Backups are encrypted before export and require the master password to restore.
