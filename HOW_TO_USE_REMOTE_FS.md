# Remote FS API - Guida all'Integrazione Client

## Panoramica

Questa API fornisce un sistema di file remoto per la gestione di progetti utente con supporto per:
- Upload di file singoli e archivi ZIP
- Gestione progetti con upload multipli
- Conversione automatica di file in Markdown
- Lettura parziale di file con intervalli di linee specifici
- Creazione e modifica di file in progetti esistenti
- Eliminazione di file singoli da progetti
- Operazioni avanzate di scrittura (replace, append, insert)
- Struttura organizzata per utente
- Metadati persistenti

**Base URL**: `http://localhost:8000`

---

## 🔧 Endpoint Disponibili

### 1. Health Check

**GET** `/health`

Verifica lo stato del server.

**Risposta**:
```json
{
  "status": "ok",
  "message": "Server in esecuzione"
}
```

---

## 📁 Gestione File Generici

### 2. Upload File Generico

**POST** `/api/files/upload`

Carica un file generico nel sistema.

**Parametri**:
- `file` (multipart/form-data): Il file da caricare

**Risposta di successo** (200):
```json
{
  "success": true,
  "message": "File caricato con successo",
  "url": "http://localhost:8000/getfile/123e4567-e89b-12d3-a456-426614174000",
  "pathname": "documento.pdf",
  "contentType": "application/pdf",
  "fileId": "123e4567-e89b-12d3-a456-426614174000",
  "size": 1024000
}
```

**Risposta di errore** (400/500):
```json
{
  "success": false,
  "error": "Errore durante l'upload del file",
  "details": "Descrizione dettagliata dell'errore"
}
```

### 3. Download File Generico

**GET** `/getfile/{file_id}`

Scarica un file tramite il suo ID.

**Parametri**:
- `file_id` (path): ID del file da scaricare

**Risposta**: Il file richiesto o errore 404 se non trovato.

### 4. Lista File Generici

**GET** `/api/files/list`

Elenca tutti i file caricati nel sistema.

**Risposta**:
```json
{
  "files": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "original_filename": "documento.pdf",
      "url": "http://localhost:8000/getfile/123e4567-e89b-12d3-a456-426614174000",
      "content_type": "application/pdf",
      "size": 1024000,
      "upload_time": "2025-06-12T10:30:00.000000"
    }
  ],
  "total": 1
}
```

---

## 📦 Gestione Progetti

### 5. Upload Progetto / Aggiunta File a Progetto

**POST** `/project/{user_id}`

Carica un file o ZIP in un progetto. Se il progetto non esiste, ne crea uno nuovo. Se esiste, aggiunge il file al progetto esistente.

**Parametri**:
- `user_id` (path): ID dell'utente
- `file` (multipart/form-data): File o ZIP da caricare
- `description` (form, optional): Descrizione del progetto
- `project_name` (form, optional): Nome del progetto (se omesso, usa il nome del file)

**Risposta di successo** (200):
```json
{
  "success": true,
  "message": "Progetto creato con successo",
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "is_new_project": true,
  "upload_type": "extracted_zip",
  "description": "Il mio progetto di esempio",
  "file_tree": {
    "name": "Il_Mio_Progetto",
    "type": "directory",
    "path": ".",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "path": "src",
        "children": [
          {
            "name": "main.py",
            "type": "file",
            "path": "src/main.py",
            "size": 1024,
            "extension": ".py"
          }
        ]
      },
      {
        "name": "README.md",
        "type": "file",
        "path": "README.md",
        "size": 512,
        "extension": ".md"
      }
    ]
  },
  "tree": "Il_Mio_Progetto/\n├── src/\n│   └── main.py\n└── README.md",
  "upload_time": "2025-06-12T10:30:00.000000",
  "total_uploads": 1,
  "uploads_history": [
    {
      "original_filename": "progetto.zip",
      "upload_time": "2025-06-12T10:30:00.000000",
      "file_size": 2048000,
      "content_type": "application/zip",
      "type": "extracted_zip",
      "extracted": true
    }
  ]
}
```

**Possibili valori di `upload_type`**:
- `single_file`: File singolo caricato
- `extracted_zip`: ZIP estratto con successo
- `zip_error`: Errore durante l'estrazione del ZIP

**Risposta di errore** (400/500):
```json
{
  "success": false,
  "error": "Nome file mancante",
  "details": "Il file deve avere un nome valido"
}
```

### 6. Eliminazione Progetto

**DELETE** `/project/{user_id}/{project_name}`

Elimina completamente un progetto e tutti i suoi file.

**Parametri**:
- `user_id` (path): ID dell'utente
- `project_name` (path): Nome del progetto da eliminare

**Risposta di successo** (200):
```json
{
  "success": true,
  "message": "Progetto eliminato con successo",
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "deleted_project": {
    "project_name": "Il Mio Progetto",
    "sanitized_name": "Il_Mio_Progetto",
    "description": "Il mio progetto di esempio",
    "uploads_count": 3
  }
}
```

**Risposta di errore** (404/500):
```json
{
  "success": false,
  "error": "Progetto non trovato",
  "details": "Il progetto 'Progetto Inesistente' non esiste per l'utente 'utente123'"
}
```

### 7. Lettura File di Progetto (Markdown)

**GET** `/project/{user_id}`

Legge un file specifico di un progetto e lo converte in Markdown. Se non viene specificato un file, restituisce l'albero dei file.

**Parametri query**:
- `file_path` (optional): Percorso del file da leggere (relativo alla root del progetto)
- `project_name` (optional): Nome del progetto specifico (se omesso, usa il più recente)
- `from_line` (optional): Linea di inizio per la lettura parziale (1-based)
- `to_line` (optional): Linea di fine per la lettura parziale (1-based, inclusiva)

**Esempi**:
- `/project/utente123` - Mostra albero dei file del progetto più recente
- `/project/utente123?project_name=Il%20Mio%20Progetto` - Mostra albero del progetto specifico
- `/project/utente123?file_path=src/main.py` - Legge il file main.py del progetto più recente
- `/project/utente123?file_path=README.md&project_name=Il%20Mio%20Progetto` - Legge README.md del progetto specifico
- `/project/utente123?file_path=file.txt&from_line=5&to_line=10` - Legge solo le linee da 5 a 10 del file

**Risposta senza file_path** (albero dei file):
```json
{
  "success": true,
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "description": "Il mio progetto di esempio",
  "file_tree": { /* struttura albero JSON */ },
  "tree": "Il_Mio_Progetto/\n├── src/\n│   └── main.py\n└── README.md",
  "message": "Specifica il parametro 'file_path' per convertire un file specifico in markdown"
}
```

**Risposta con file_path** (contenuto file):
```json
{
  "success": true,
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "description": "Il mio progetto di esempio",
  "file_path": "src/main.py",
  "original_filename": "main.py",
  "content": "```python\nprint('Hello World')\n```",
  "is_markdown_conversion": false,
  "file_type": "text",
  "processing_time": "2025-06-12T10:35:00.000000",
  "line_info": {
    "from_line": 1,
    "to_line": 10,
    "returned_lines": 5,
    "total_lines": 50,
    "is_partial": true
  }
}
```

**Valori di `file_type`**:
- `text`: File di testo letto direttamente
- `converted`: File convertito tramite MarkItDown

**Campo `line_info`** (presente quando si usa from_line/to_line):
- `from_line`: Linea di inizio richiesta
- `to_line`: Linea di fine richiesta (null se non specificata)
- `returned_lines`: Numero di linee effettivamente restituite
- `total_lines`: Numero totale di linee nel file
- `is_partial`: Indica se è stata restituita solo una porzione del file

**Possibili errori**:
```json
{
  "success": false,
  "error": "File non trovato",
  "details": "Il file 'src/nonexistent.py' non esiste nel progetto"
}
```

```json
{
  "success": false,
  "error": "Formato non supportato",
  "details": "Il percorso specificato non è un file"
}
```

```json
{
  "success": false,
  "error": "Accesso negato",
  "details": "Non è possibile accedere a file al di fuori del progetto"
}
```

### 8. Albero File di Progetto

**GET** `/project/{user_id}/tree`

Restituisce solo l'albero dei file di un progetto.

**Parametri query**:
- `project_name` (optional): Nome del progetto specifico (se omesso, usa il più recente)

**Risposta**:
```json
{
  "success": true,
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "description": "Il mio progetto di esempio",
  "file_tree": {
    "name": "Il_Mio_Progetto",
    "type": "directory",
    "path": ".",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "path": "src",
        "children": [
          {
            "name": "main.py",
            "type": "file",
            "path": "src/main.py",
            "size": 1024,
            "extension": ".py"
          }
        ]
      }
    ]
  },
  "tree": "Il_Mio_Progetto/\n├── src/\n│   └── main.py\n└── README.md",
  "generation_time": "2025-06-12T10:35:00.000000"
}
```

### 9. Eliminazione File da Progetto

**DELETE** `/project/{user_id}/delete-file`

Elimina un file specifico da un progetto esistente.

**Parametri**:
- `user_id` (path): ID dell'utente
- `file_path` (form): Percorso del file da eliminare (relativo alla root del progetto)
- `project_name` (form): Nome del progetto

**Risposta di successo** (200):
```json
{
  "success": true,
  "message": "File eliminato con successo",
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "deleted_file": {
    "file_path": "src/old_file.py",
    "original_filename": "old_file.py",
    "file_size": 1024,
    "deleted_time": "2025-06-12T10:50:00.000000"
  },
  "file_tree": {
    "name": "Il_Mio_Progetto",
    "type": "directory",
    "path": ".",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "path": "src",
        "children": [
          {
            "name": "main.py",
            "type": "file",
            "path": "src/main.py",
            "size": 2048,
            "extension": ".py"
          }
        ]
      }
    ]
  },
  "tree": "Il_Mio_Progetto/\n└── src/\n    └── main.py",
  "operation_time": "2025-06-12T10:50:00.000000",
  "remaining_files": 1
}
```

**Risposta di errore** (404/403/500):
```json
{
  "success": false,
  "error": "File non trovato",
  "details": "Il file 'src/nonexistent.py' non esiste nel progetto"
}
```

```json
{
  "success": false,
  "error": "Accesso negato",
  "details": "Non è possibile eliminare file al di fuori del progetto"
}
```

```json
{
  "success": false,
  "error": "Progetto non trovato",
  "details": "Il progetto 'Progetto Inesistente' non esiste per l'utente 'utente123'"
}
```

### 10. Creazione Nuovo File in Progetto

**POST** `/project/{user_id}/create-file`

Crea un nuovo file in un progetto esistente.

**Parametri**:
- `user_id` (path): ID dell'utente
- `file_path` (form): Percorso del nuovo file (relativo alla root del progetto)
- `project_name` (form): Nome del progetto esistente
- `content` (form, optional): Contenuto del file (default: stringa vuota)
- `description` (form, optional): Aggiorna la descrizione del progetto

**Risposta di successo** (201):
```json
{
  "success": true,
  "message": "File creato con successo",
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "file_path": "src/nuovo_file.py",
  "file_size": 1024,
  "content_length": 150,
  "created_time": "2025-06-12T10:40:00.000000",
  "description": "Progetto aggiornato"
}
```

**Risposta di errore** (404/409/500):
```json
{
  "success": false,
  "error": "File già esistente",
  "details": "Il file 'src/nuovo_file.py' esiste già nel progetto"
}
```

### 12. Scrittura/Modifica File in Progetto

**PUT** `/project/{user_id}/write-file`

Scrive o modifica il contenuto di un file esistente in un progetto con supporto per operazioni specifiche e intervalli di linee.

**Parametri**:
- `user_id` (path): ID dell'utente
- `file_path` (form): Percorso del file da modificare
- `project_name` (form): Nome del progetto
- `content` (form): Nuovo contenuto da scrivere
- `operation` (form, optional): Tipo di operazione (default: "replace")
  - `replace`: Sostituisce tutto il contenuto o un intervallo specifico
  - `append`: Aggiunge contenuto alla fine del file
  - `insert`: Inserisce contenuto in una posizione specifica
- `from_line` (form, optional): Linea di inizio per operazioni su intervalli (1-based)
- `to_line` (form, optional): Linea di fine per operazioni su intervalli (1-based, inclusiva)
- `description` (form, optional): Aggiorna la descrizione del progetto

**Esempi di utilizzo**:
- **Replace completo**: `operation=replace` (senza from_line/to_line)
- **Replace intervallo**: `operation=replace&from_line=5&to_line=10`
- **Append**: `operation=append`
- **Insert**: `operation=insert&from_line=5`

**Risposta di successo** (200):
```json
{
  "success": true,
  "message": "File modificato con successo",
  "project_name": "Il Mio Progetto",
  "sanitized_name": "Il_Mio_Progetto",
  "user_id": "utente123",
  "file_path": "src/file.py",
  "operation": "replace",
  "operation_details": "sostituito intervallo linee 5-10",
  "from_line": 5,
  "to_line": 10,
  "lines_affected": 6,
  "size_before": 2048,
  "size_after": 2560,
  "content_length": 150,
  "modified_time": "2025-06-12T10:45:00.000000",
  "description": "Progetto aggiornato"
}
```

**Possibili valori di `operation_details`**:
- `"sostituito tutto il contenuto"`: Replace completo
- `"sostituito intervallo linee X-Y"`: Replace su intervallo
- `"aggiunto contenuto alla fine (N linee)"`: Append
- `"inserito contenuto alla linea X (N linee)"`: Insert

**Risposta di errore** (400/404/500):
```json
{
  "success": false,
  "error": "Operazione non supportata",
  "details": "Operazione 'invalid_op' non valida. Usa: replace, append, insert"
}
```

### 13. Lista Progetti Utente

**GET** `/list/projects/{user_id}`

Elenca tutti i progetti di un utente.

**Parametri**:
- `user_id` (path): ID dell'utente

**Risposta**:
```json
{
  "success": true,
  "user_id": "utente123",
  "projects": [
    {
      "project_name": "Il Mio Progetto",
      "sanitized_name": "Il_Mio_Progetto",
      "user_id": "utente123",
      "description": "Il mio progetto di esempio",
      "upload_time": "2025-06-12T10:30:00.000000",
      "file_tree": { /* struttura albero */ },
      "tree_text": "Il_Mio_Progetto/\n├── src/\n└── README.md"
    }
  ],
  "total": 1
}
```

---

## 🔧 Caratteristiche Tecniche

### File di Testo Supportati (Lettura Diretta)

I seguenti tipi di file vengono letti direttamente senza conversione:
- Testo: `.txt`, `.md`, `.csv`
- Configurazione: `.json`, `.xml`, `.yml`, `.yaml`, `.ini`, `.cfg`, `.conf`, `.env`
- Codice sorgente: `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.html`, `.css`, `.scss`, `.c`, `.cpp`, `.java`, `.go`, `.rs`, `.php`, `.rb`, ecc.
- Script: `.sh`, `.bat`, `.cmd`, `.ps1`
- Log: `.log`, `.gitignore`, `.gitattributes`

### Conversione MarkItDown

Per tutti gli altri tipi di file (PDF, Word, Excel, immagini, ecc.), viene utilizzato MarkItDown per la conversione in Markdown.

### Struttura Directory

```
users/
└── {user_id}/
    └── projects/
        └── {sanitized_project_name}/
            ├── .meta/                    # Cartella nascosta (non mostrata nel tree)
            │   ├── description.txt       # Descrizione del progetto
            │   └── project_metadata.json # Metadati del progetto
            ├── file1.py
            ├── file2.txt
            └── subfolder/
                └── file3.md
```

### Upload Multipli

- È possibile caricare più file nello stesso progetto specificando `project_name` nel form
- Ogni upload viene registrato nella cronologia
- La descrizione viene sempre sovrascritta ad ogni upload
- I file vengono aggiunti, non sostituiti

### Operazioni su File

**Creazione nuovi file**:
- Endpoint dedicato per creare file in progetti esistenti
- Supporto per creazione di directory annidate automaticamente
- Validazione sicurezza: impedisce creazione di file fuori dal progetto

**Modifica file esistenti**:
- Tre modalità operative: `replace`, `append`, `insert`
- Supporto per intervalli di linee specifici
- Backup automatico e gestione errori

**Eliminazione file**:
- Endpoint dedicato per eliminare file singoli da progetti
- Validazione sicurezza: impedisce eliminazione di file fuori dal progetto
- Protezione file di sistema (.meta)
- Aggiornamento automatico della struttura del progetto
- Registrazione dell'operazione nella cronologia

**Lettura parziale**:
- Parametri `from_line` e `to_line` per leggere solo porzioni di file
- Informazioni dettagliate sui risultati nel campo `line_info`
- Ottimizzazione performance per file di grandi dimensioni

### Cronologia Operazioni

Ogni progetto mantiene una cronologia completa delle operazioni:
- Upload di file (con metadati completi)
- Creazione di nuovi file
- Modifiche a file esistenti (con dettagli dell'operazione)
- Eliminazione di file (con informazioni del file eliminato)
- Timestamp e informazioni dimensioni

### Gestione Errori

Tutti gli endpoint restituiscono errori in formato consistente:
```json
{
  "success": false,
  "error": "Titolo dell'errore",
  "details": "Descrizione dettagliata del problema"
}
```

**Codici di stato comuni**:
- `200`: Successo
- `400`: Richiesta malformata (es. file mancante)
- `403`: Accesso negato (es. tentativo di accedere a file fuori dal progetto)
- `404`: Risorsa non trovata (es. progetto o file inesistente)
- `500`: Errore interno del server

---

## 🚀 Esempi di Integrazione

### Upload Nuovo Progetto (JavaScript)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('project_name', 'Il Mio Progetto');
formData.append('description', 'Descrizione del progetto');

const response = await fetch('http://localhost:8000/project/utente123', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Progetto creato:', result.project_name);
  console.log('Nome sanitizzato:', result.sanitized_name);
  console.log('Tree:', result.tree);
}
```

### Aggiunta File a Progetto Esistente (JavaScript)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Descrizione aggiornata');
formData.append('project_name', 'Il Mio Progetto'); // Nome del progetto esistente

const response = await fetch('http://localhost:8000/project/utente123', {
  method: 'POST',
  body: formData
});
```

### Lettura File in Markdown (JavaScript)

```javascript
const response = await fetch(
  'http://localhost:8000/project/utente123?file_path=src/main.py&project_name=Il_Mio_Progetto'
);

const result = await response.json();
if (result.success) {
  console.log('Contenuto markdown:', result.content);
}
```

### Lettura File con Intervallo di Linee (JavaScript)

```javascript
const response = await fetch(
  'http://localhost:8000/project/utente123?file_path=file.txt&from_line=5&to_line=10'
);

const result = await response.json();
if (result.success) {
  console.log('Contenuto parziale:', result.content);
  console.log('Info linee:', result.line_info);
}
```

### Creazione Nuovo File (JavaScript)

```javascript
const formData = new FormData();
formData.append('file_path', 'src/nuovo_file.py');
formData.append('project_name', 'Il Mio Progetto');
formData.append('content', 'print("Hello World!")');
formData.append('description', 'Aggiunta nuovo file');

const response = await fetch('http://localhost:8000/project/utente123/create-file', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('File creato:', result.file_path);
}
```

### Eliminazione File (JavaScript)

```javascript
const formData = new FormData();
formData.append('file_path', 'src/old_file.py');
formData.append('project_name', 'Il Mio Progetto');

const response = await fetch('http://localhost:8000/project/utente123/delete-file', {
  method: 'DELETE',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('File eliminato:', result.deleted_file.file_path);
  console.log('File rimanenti:', result.remaining_files);
  console.log('Struttura aggiornata:', result.tree);
}
```

### Modifica File Esistente (JavaScript)

```javascript
// Replace completo
const formData = new FormData();
formData.append('file_path', 'src/file.py');
formData.append('project_name', 'Il Mio Progetto');
formData.append('content', 'print("Contenuto sostituito!")');
formData.append('operation', 'replace');

const response = await fetch('http://localhost:8000/project/utente123/write-file', {
  method: 'PUT',
  body: formData
});
```

### Modifica Intervallo di Linee (JavaScript)

```javascript
// Replace solo linee 5-10
const formData = new FormData();
formData.append('file_path', 'src/file.py');
formData.append('project_name', 'Il Mio Progetto');
formData.append('content', 'linea1\nlinea2\nlinea3');
formData.append('operation', 'replace');
formData.append('from_line', '5');
formData.append('to_line', '10');

const response = await fetch('http://localhost:8000/project/utente123/write-file', {
  method: 'PUT',
  body: formData
});
```

### Append Contenuto (JavaScript)

```javascript
const formData = new FormData();
formData.append('file_path', 'README.md');
formData.append('project_name', 'Il Mio Progetto');
formData.append('content', '\n## Nuova Sezione\nContenuto aggiunto alla fine');
formData.append('operation', 'append');

const response = await fetch('http://localhost:8000/project/utente123/write-file', {
  method: 'PUT',
  body: formData
});
```

### Lista Progetti (JavaScript)

```javascript
const response = await fetch('http://localhost:8000/list/projects/utente123');
const result = await response.json();

if (result.success) {
  result.projects.forEach(project => {
    console.log(`Progetto: ${project.project_name}`);
    console.log(`Nome sanitizzato: ${project.sanitized_name}`);
    console.log(`Descrizione: ${project.description}`);
  });
}
```

---

## ⚠️ Note Importanti

1. **Sicurezza**: La cartella `.meta` non viene mai mostrata nel tree dei file per mantenere nascosti i metadati
2. **Persistenza**: Tutti i metadati e le descrizioni sono salvati su disco e persistono al riavvio del server
3. **Upload vs Modifica**: 
   - Upload file: Aggiunge sempre nuovi file, non sostituisce quelli esistenti
   - Write-file: Modifica il contenuto di file già esistenti
   - Create-file: Crea nuovi file, fallisce se il file esiste già
4. **Descrizioni**: Ad ogni upload o modifica, il file `description.txt` può essere aggiornato
5. **Performance**: 
   - Per progetti con molti file, la generazione del tree potrebbe richiedere qualche secondo
   - La lettura parziale di file ottimizza le performance per file di grandi dimensioni
6. **Operazioni su File**:
   - Replace: Può sostituire tutto il file o solo un intervallo di linee
   - Append: Aggiunge sempre alla fine del file
   - Insert: Inserisce contenuto alla posizione specificata, spostando il resto
7. **Intervalli di Linee**: 
   - Numerazione 1-based (la prima linea è 1, non 0)
   - `to_line` è inclusivo
   - Se `to_line` non è specificato, viene usata l'ultima linea del file
8. **Limiti**: Non ci sono limiti espliciti sulla dimensione dei file, ma dipendono dalla configurazione del server

