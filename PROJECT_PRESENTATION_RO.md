# Document de Prezentare a Proiectului

## Titlul Proiectului
Sistem de Management al Comenzilor pentru Restaurant cu Status Live

## Prezentare Generală a Proiectului

Acest proiect dezvoltă un sistem complet de management al comenzilor pentru restaurante, conceput pentru a simplifica procesul de comandă, a oferi clienților urmărirea în timp real a comenzilor și a pune la dispoziție interfețe eficiente pentru bucătărie și manager. Sistemul se concentrează pe modelarea soluției, designul arhitectural, integrarea tehnologică și demonstrația conceptului.

**Caracteristici Cheie Implementate:**
*   **Managementul Meselor:** Codurile QR unice pentru mese permit clienților să acceseze un meniu digital specific mesei lor. Statusul mesei (ocupată/disponibilă) este actualizat dinamic.
*   **Interfața pentru Clienți:** Clienții pot naviga într-un meniu digital, pot adăuga articole într-un coș, pot plasa comenzi asociate mesei lor și pot vizualiza actualizări în timp real ale statusului comenzilor.
*   **Managementul Comenzilor:** API backend robust pentru crearea, recuperarea și actualizarea comenzilor și a articolelor individuale din comandă.
*   **Interfața pentru Bucătărie:** Personalul din bucătărie poate vizualiza o listă în timp real a comenzilor active și poate actualiza statusul acestora (ex: în așteptare, în preparare, gata) cu feedback imediat către clienți.
*   **Tabloul de Bord al Managerului:** Oferă statistici live despre mesele active, comenzile în așteptare/preparare și venitul total.
*   **Comunicare în Timp Real:** Utilizează Socket.IO pentru actualizări instantanee pe toate interfețele (comenzi noi, modificări de status al comenzilor, modificări de status al mesei și statistici pentru manager).

## Stack Tehnologic

*   **Frontend:**
    *   **React:** Pentru construirea interfețelor de utilizator dinamice și interactive (Client, Bucătărie, Manager).
    *   **TypeScript:** Pentru siguranța tipurilor și o calitate îmbunătățită a codului.
    *   **Tailwind CSS:** Pentru stilizare rapidă, bazată pe utilitare, și design responsiv.
    *   **Vite:** Ca instrument de construire pentru o experiență de dezvoltare rapidă.
    *   **React Router DOM:** Pentru rutarea pe partea de client, inclusiv URL-uri specifice meselor pentru codurile QR.
    *   **Shadcn/ui:** Pentru componente UI accesibile și personalizabile (ex: Dialog pentru coduri QR).
    *   **qrcode.react:** Pentru generarea imaginilor codurilor QR pe frontend.
*   **Backend:**
    *   **Node.js cu Express.js:** Pentru logica server-side, endpoint-uri API RESTful și gestionarea eficientă a cererilor.
    *   **Socket.IO:** Pentru a permite comunicarea bidirecțională în timp real între frontend și backend.
    *   **pg (client PostgreSQL):** Pentru interacțiunea cu baza de date.
    *   **node-pg-migrate:** Pentru gestionarea migrațiilor schemei bazei de date.
    *   **Nodemon:** Pentru reporniri automate ale serverului în timpul dezvoltării (hot reload).
*   **Bază de Date:**
    *   **PostgreSQL:** O bază de date relațională robustă pentru stocarea tuturor datelor aplicației (meniuri, comenzi, mese, etc.).
*   **Infrastructură:**
    *   **Docker & Docker Compose:** Pentru containerizarea tuturor serviciilor (frontend, backend, bază de date), permițând un mediu de dezvoltare consistent și izolat cu capacități de reîncărcare la cald.

## Arhitectura Sistemului

Sistemul urmează o arhitectură client-server, orchestrată de Docker Compose.

*   **Frontend (React/Vite):**
    *   Include trei vizualizări principale: Interfața pentru Clienți, Interfața pentru Bucătărie și Tabloul de Bord al Managerului.
    *   Interacționează cu backend-ul prin apeluri API RESTful pentru preluarea inițială a datelor și manipularea stării.
    *   Utilizează Socket.IO pentru actualizări în timp real transmise de la backend.
    *   Folosește React Router pentru navigare și gestionarea vizualizărilor pentru clienți specifice meselor (simulând scanări de coduri QR).
*   **Backend (Node.js/Express):**
    *   Acționează ca hub central, expunând endpoint-uri API RESTful pentru operații CRUD pe entități precum articole de meniu, mese, comenzi și articole de comandă.
    *   Gestionează conexiunile WebSocket prin Socket.IO, emițând evenimente pentru comenzi noi, modificări ale statusului comenzilor, modificări ale statusului meselor și actualizări statistice în timp real.
    *   Se conectează la baza de date PostgreSQL pentru persistența datelor.
    *   Include o structură de rute dedicată pentru a organiza endpoint-urile API și a integra Socket.IO și pool-ul DB.
*   **Bază de Date (PostgreSQL):**
    *   Stochează toate datele aplicației, inclusiv `tables`, `menu_items`, `orders`, `order_items`.
    *   Schema este gestionată prin `node-pg-migrate`.
*   **Comunicare în Timp Real (Socket.IO):**
    *   Oferă comunicare instantanee, bidirecțională între backend și toți clienții frontend conectați, asigurând că toate interfețele reflectă cea mai recentă stare fără reîmprospătări manuale.

**Fluxul de Date:**
1.  **Clientul Scanează Codul QR:** (Simulat prin navigarea la `/customer/table/:tableId`). Frontend-ul (`TableCustomerView`) extrage `tableId`.
2.  **Clientul Navighează Meniul/Plasează Comanda:** Frontend-ul (`Menu`, `OrderCart`) preia articolele din meniu prin `GET /api/menu_items`. Când o comandă este plasată, `POST /api/orders` este trimisă către backend.
3.  **Backend-ul Procesează Comanda:**
    *   Creează `order` și `order_items` într-o tranzacție.
    *   Actualizează statusul `table` la 'ocupată'.
    *   Emite evenimente Socket.IO: `newOrder`, `tableStatusUpdate`, `statisticsUpdate`.
4.  **Bucătăria Primește Comanda:** Frontend-ul (`KitchenView`) primește evenimentul `newOrder`, afișează noua comandă.
5.  **Bucătăria Actualizează Statusul Comenzii:** `PUT /api/orders/:id/status` este trimisă către backend.
6.  **Backend-ul Actualizează Statusul Comenzii/Mesei:**
    *   Actualizează statusul `order`.
    *   Dacă statusul este 'servită', 'finalizată' sau 'anulată', actualizează statusul `table` la 'disponibilă'.
    *   Emite evenimente Socket.IO: `orderStatusUpdate`, `tableStatusUpdate`, `statisticsUpdate`.
7.  **Clientul Vede Actualizarea:** Frontend-ul (`CustomerOrderStatus`) primește evenimentul `orderStatusUpdate`, afișează noul status.
8.  **Managerul Vede Actualizarea:** Frontend-ul (`ManagerDashboard`) primește evenimentul `statisticsUpdate`, actualizează statisticile live.

**Simulări / Simplificări:**
*   Scanarea codului QR este simulată prin navigare directă la URL.
*   Autentificarea/autorizarea utilizatorilor nu este implementată.
*   Logica complexă de rutare a bucătăriei (ex: stații diferite) este simplificată.
*   Raportarea veniturilor este o simplă sumă a comenzilor finalizate.

## Capturi de Ecran
---

### Pagina Principală a Clientului (Vizualizare Mese)

<img src="image.png" alt="Pagina Principală a Clientului (Vizualizare Mese)" width="600px" style="display: block; margin: 0 auto;">

---

### Dialog Cod QR pentru o Masă

<img src="image-1.png" alt="Dialog Cod QR pentru o Masă" width="400px" style="display: block; margin: 0 auto;">

---

### Interfața de Comandă Specifică Mesei pentru Clienți

<img src="image-2.png" alt="Interfața de Comandă Specifică Mesei pentru Clienți" width="600px" style="display: block; margin: 0 auto;">

---

### Afișaj Bucătărie

<img src="image-3.png" alt="Afișaj Bucătărie" width="700px" style="display: block; margin: 0 auto;">

---

### Tabloul de Bord al Managerului

<img src="image-4.png" alt="Tabloul de Bord al Managerului" width="700px" style="display: block; margin: 0 auto;">

---

## Schema Bazei de Date


**Tabele (Tables):**
*   `id` (SERIAL PRIMARY KEY)
*   `qr_code` (TEXT, UNIQUE, NOT NULL): Identificator unic pentru codul QR.
*   `status` (TEXT, NOT NULL, DEFAULT 'available'): 'available', 'occupied'.
*   `created_at`, `updated_at`

**Articole Meniu (Menu Items):**
*   `id` (SERIAL PRIMARY KEY)
*   `name` (TEXT, NOT NULL)
*   `description` (TEXT)
*   `price` (DECIMAL, NOT NULL)
*   `category` (TEXT, NOT NULL)
*   `image_url` (TEXT)
*   `is_available` (BOOLEAN, NOT NULL, DEFAULT TRUE)
*   `created_at`, `updated_at`

**Comenzi (Orders):**
*   `id` (SERIAL PRIMARY KEY)
*   `table_id` (INTEGER, NOT NULL, REFERENCES `tables` ON DELETE CASCADE)
*   `status` (TEXT, NOT NULL, DEFAULT 'pending'): 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'.
*   `total_amount` (DECIMAL, NOT NULL, DEFAULT 0)
*   `created_at`, `updated_at`

**Articole Comandă (Order Items):**
*   `id` (SERIAL PRIMARY KEY)
*   `order_id` (INTEGER, NOT NULL, REFERENCES `orders` ON DELETE CASCADE)
*   `menu_item_id` (INTEGER, NOT NULL, REFERENCES `menu_items` ON DELETE CASCADE)
*   `quantity` (INTEGER, NOT NULL, DEFAULT 1)
*   `price` (DECIMAL, NOT NULL): Prețul articolului la momentul comenzii.
*   `notes` (TEXT)
*   `created_at`, `updated_at`

## Rularea Aplicației

### Precondiții

*   **Docker Desktop:** Asigurați-vă că Docker Desktop este instalat și rulează (pentru Windows/macOS).
*   **Node.js & npm:** Deși este în principal Dockerizat, veți avea nevoie de Node.js (v18+) și npm instalate pe mașina gazdă pentru a rula `npm install` inițial pentru `shadcn/ui` sau alte instrumente locale, și pentru a executa scripturi de migrare/seed în afara Docker-ului, dacă este necesar.

### Instrucțiuni de Configurare

1.  **Clonați depozitul:**
    ```bash
    git clone https://github.com/amaliaandrisoaei-jpg/Proiect-SSATR
    cd restaurant-order-system
    ```
2.  **Configurare Inițială Backend:**
    *   Navigați la directorul backend: `cd backend`
    *   Instalați dependențele: `npm install`
    *   Asigurați-vă că `backend/.env` este configurat corect cu `DATABASE_URL` pentru scripturile locale de migrare/seed:
        ```
        DATABASE_URL=postgres://user:password@localhost:5432/restaurantdb
        PORT=3000
        ```
    *   (Opțional) Dacă `nodemon.json` sau alte fișiere de configurare nu sunt prezente sau diferă, asigurați-vă că se aliniază cu configurarea hot-reload a proiectului.
3.  **Configurare Inițială Frontend:**
    *   Navigați la directorul frontend: `cd frontend`
    *   Instalați dependențele: `npm install`
    *   (Opțional) Dacă `vite.config.ts` sau `tsconfig.json` nu sunt prezente sau diferă, asigurați-vă că se aliniază cu configurarea hot-reload și alias a proiectului.
4.  **Pornire Infrastructură (Docker Compose):**
    *   Din rădăcina proiectului (directorul `restaurant-order-system`), construiți și porniți toate serviciile:
        ```bash
        docker compose up --build
        ```
    *   *Notă: La prima rulare sau după modificări semnificative, `--build` este esențial. Dacă apar probleme, luați în considerare `docker compose build --no-cache`.*
5.  **Rulați Migrările Bazei de Date:**
    *   Navigați la directorul backend: `cd backend`
    *   Rulați migrările pentru a crea tabelele: `npm run migrate:up`
6.  **Populați Baza de Date (Opțional, pentru date demo):**
    *   Din directorul backend: `cd backend`
    *   Populați cu date eșantion: `npm run seed`

### Accesarea Aplicației

*   **Frontend:** Deschideți browserul web la `http://localhost:5173`.
*   **API Backend:** API-ul backend este disponibil la `http://localhost:3000`.

## Îmbunătățiri Viitoare

*   **CRUD Complet pentru Mese & Articole Meniu (Interfața Managerului):** Permite managerilor să adauge, editeze și elimine mese și articole de meniu direct dintr-o interfață dedicată.
*   **Notificări:** Implementați notificări desktop sau în aplicație pentru bucătărie și manager pentru evenimente urgente.
*   **Rapoarte:** Rapoarte de venituri mai detaliate, articole populare, ore de vârf.
*   **Management Cod QR:** Endpoint-uri backend pentru a genera și gestiona coduri QR, poate chiar șabloane printabile.
*   **Logica Ocupării Meselor:** Logică mai sofisticată pentru schimbarea statusului mesei (ex: eliberarea automată a unei mese după o anumită perioadă de status 'servită').
*   **Încărcare Imagini:** Permite încărcarea imaginilor pentru articolele din meniu.
