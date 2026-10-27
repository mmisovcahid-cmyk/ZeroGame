/** @type {import('tailwindcss').Config} */
// ZeroGame özel stilleri App.css/index.css'te yazıldığı için config yalnızca içerik taraması yapar;
// shadcn renk eşlemeleri ve animasyon eklentisi kaldırıldı.
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
}
