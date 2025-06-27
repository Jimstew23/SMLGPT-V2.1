# SMLGPT V2.0 Logo Assets

This folder contains all logo assets for the SMLGPT V2.0 application.

## Folder Structure

### `/main/`
Contains the primary SML logos for headers, splash screens, and main branding:
- `sml-bow-tie-logo.svg` - The distinctive bow-tie logo (blue/red triangles)
- `sml-main-logo.svg` - Full SAVE MY LIFE 2.0 branded logo
- `sml-horizontal-logo.svg` - Horizontal layout version
- `sml-icon-only.svg` - Icon-only version for small spaces

### `/controls/`
Contains control-specific logos and icons for UI elements:
- `upload-icon.svg` - File upload control icon
- `chat-icon.svg` - Chat interface icon
- `analysis-icon.svg` - Safety analysis icon
- `alert-icon.svg` - Safety alert/warning icon
- `stop-icon.svg` - Emergency stop icon

### `/icons/`
Contains small icons and favicon variations:
- `favicon-16x16.png` - 16x16 favicon
- `favicon-32x32.png` - 32x32 favicon
- `apple-touch-icon.png` - Apple touch icon
- `android-chrome-192x192.png` - Android icon

## Design Guidelines

- **Primary Color**: #4CAF50 (Safety Green)
- **Secondary Color**: #66BB6A (Light Green)
- **Accent Colors**: Blue (#1976D2) and Red (#D32F2F) for bow-tie logo
- **Background**: White or transparent
- **Style**: Bold, professional, safety-focused

## Usage in Code

```javascript
// Main logo in header
<img src="/assets/logos/main/sml-bow-tie-logo.svg" alt="SML Logo" />

// Control icons
<img src="/assets/logos/controls/upload-icon.svg" alt="Upload" />

// Favicons are automatically loaded from /icons/ folder
```

## File Formats

- **SVG**: Vector graphics for scalable logos (preferred)
- **PNG**: Raster graphics for favicons and specific use cases
- **WebP**: Optimized web format for faster loading (when needed)
