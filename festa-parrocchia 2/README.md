# 🎪 Festa Parrocchia — App Gastronomia

## Deploy su Vercel (passo per passo)

### 1. Crea account GitHub (se non ce l'hai)
- Vai su https://github.com e registrati

### 2. Carica il progetto su GitHub
- Vai su https://github.com/new
- Nome repository: `festa-parrocchia`
- Clicca **"Create repository"**
- Trascina tutti i file di questa cartella nel browser GitHub oppure usa i comandi:
```bash
git init
git add .
git commit -m "prima versione"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/festa-parrocchia.git
git push -u origin main
```

### 3. Deploy su Vercel
- Vai su https://vercel.com e accedi con GitHub
- Clicca **"Add New Project"**
- Seleziona il repository `festa-parrocchia`
- Vercel rileva automaticamente Vite → clicca **"Deploy"**
- Dopo 1-2 minuti ricevi un link tipo: `https://festa-parrocchia.vercel.app`

### 4. Installa sul telefono (PWA)
**Android (Chrome):**
- Apri il link sul telefono
- Comparirà un banner "Aggiungi a schermata Home" → clicca

**iPhone (Safari):**
- Apri il link in Safari
- Tocca il tasto Condividi (quadrato con freccia su)
- Scorri e tocca **"Aggiungi a schermata Home"**

## Credenziali default
- Admin: `admin` / `admin123`
- Cameriere: `cameriere1` / `cam1`
- Banco: `banco` / `banco1`
- Cassa: `cassa` / `cassa1`
