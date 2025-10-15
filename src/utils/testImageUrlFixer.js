// Test the image URL fixing functionality
import { fixThemeImageUrls, fixThemeCss } from "./imageUrlFixer";

// Test HTML with relative image paths
const testHtml = `
<div class="top-collection-container">
  <div class="top-collection-card">
    <img src="storage/theme/5/injIiC7mMAsUGuAdrVlepy1uu5qckRptDCxhlGZX.webp" alt="Collection 1">
    <h3>Our Collections</h3>
  </div>
  <div class="top-collection-card">
    <img data-src="storage/theme/5/LUygQtkwQvtPrgviMZPaa0RJQ7zIsbjiR1yXTdzv.webp" alt="Collection 2">
    <h3>Our Collections</h3>
  </div>
</div>
`;

// Test CSS with problematic rules
const testCss = `
.top-collection-card img {
  border-radius: 16px;
  max-width: 100%;
  text-indent: -9999px;
  transition: transform 300ms ease;
}
`;
