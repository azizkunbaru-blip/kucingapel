Game web sederhana bertema kucing menangkap apel jatuh. Dibuat dengan HTML/CSS/JS vanilla, aman untuk GitHub Pages dan siap dimainkan di desktop maupun mobile.

## Cara Main
- **Desktop:** tekan tombol **←/→** atau **A/D** untuk bergerak.
- **Mobile:** gunakan tombol **◀/▶** di bawah layar atau geser pada area game.
- Tangkap apel untuk menambah skor, hindari bom, dan ambil hati untuk menambah nyawa.
- Level naik tiap 10 skor, kecepatan dan spawn apel meningkat.

## Audio (Howler.js)
Game menggunakan Howler.js untuk SFX dan BGM. File audio bisa kamu tambahkan di folder:
```
/sound/
  bgm.mp3
  catch.mp3
  fail.mp3
  start.mp3
  gameover.mp3
```
Jika file audio belum ada, game tetap berjalan tanpa error (audio akan fallback ke beep sederhana).

> Troubleshooting: **Jika audio tidak bunyi di HP, tekan tombol Start dulu.**

## GitHub Pages & Custom Domain
1. Pastikan repo ini sudah di-push ke GitHub.
2. Buka **Settings → Pages** lalu pilih branch dan folder root.
3. File `CNAME` sudah tersedia untuk custom domain (jika digunakan).

Selamat bermain! 🎮
