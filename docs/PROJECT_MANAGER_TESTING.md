# Come testare le nuove funzionalità del Project Manager

## Prerequisiti
1. Assicurarsi che il server Remote FS sia in esecuzione su `http://localhost:8000`
2. Aprire l'applicazione e navigare al Project Manager

## Test della creazione di progetti senza file

### Scenario: Creare un nuovo progetto vuoto
1. Aprire il Project Manager dal menu tools
2. Navigare alla tab "Create"
3. Inserire un nome progetto (es. "Test Project")
4. Inserire una descrizione opzionale
5. Cliccare "Create Project"

### Risultato atteso:
- Il progetto viene creato con successo
- Viene automaticamente creato un file `README.md` con il nome e la descrizione del progetto
- Il progetto viene selezionato automaticamente
- Toast di successo viene mostrato

## Test della selezione e cancellazione di file

### Scenario: Selezionare e cancellare file singoli
1. Avere un progetto con alcuni file (creato precedentemente o con file caricati)
2. Navigare alla tab "Files" del progetto
3. Nella sezione "File Tree", cliccare su un file per selezionarlo

### Risultato atteso:
- Il file selezionato mostra un bordo blu e sfondo chiaro
- Apparisce un badge con il numero di file selezionati
- Al passaggio del mouse sul file selezionato, appare un pulsante rosso di cancellazione

### Scenario: Cancellare un file selezionato
1. Con un file selezionato, passare il mouse sopra il file
2. Cliccare sul pulsante di cancellazione rosso
3. Confermare nel dialog che appare

### Risultato atteso:
- Dialog di conferma viene mostrato
- Dopo la conferma, il file viene eliminato
- L'albero dei file viene aggiornato automaticamente
- Toast di successo viene mostrato

## Test degli upload multipli

### Scenario: Caricare più file in un progetto esistente
1. Navigare alla tab "Files" di un progetto esistente
2. Utilizzare la sezione "Upload Files" per selezionare più file
3. Trascinare file nella zona di drop o usare il browser
4. Cliccare "Upload Files"

### Risultato atteso:
- Tutti i file vengono caricati uno per uno
- L'albero dei file viene aggiornato
- Toast di successo viene mostrato

## Test degli errori

### Scenario: Tentare di eliminare un file inesistente
- Questo test richiede modifiche manuali all'API o simulazione di errori

### Scenario: Creare un progetto con nome duplicato
1. Creare un progetto con un nome specifico
2. Tentare di creare un altro progetto con lo stesso nome

### Risultato atteso:
- Toast di errore appropriato viene mostrato
- L'interfaccia rimane stabile

## Note per il testing

1. **Persistenza**: I progetti creati persistono tra le sessioni
2. **Selezione multipla**: È possibile selezionare più file contemporaneamente
3. **Feedback visivo**: Tutti i cambiamenti di stato hanno feedback visivo appropriato
4. **Gestione errori**: Tutti gli errori vengono gestiti con toast informativi

## Comandi per testing automatico

Per eseguire test automatizzati (se il server è in esecuzione):

```javascript
// Nel browser, aprire la console e digitare:
PROJECT_MANAGER_TESTS.runAllTests()
```

Questo eseguirà una suite di test che verifica:
- Creazione di progetti
- Lista di progetti
- Eliminazione di file
- Upload di file multipli
