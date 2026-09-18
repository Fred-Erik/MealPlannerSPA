Ik wil een SPA voor het plannen van maaltijden met een Supabase-backend. Ik heb een lijst van ergens tussen de 20-100 recepten. Ik wil een systeem waarbij we recepten rouleren volgens een aantal categorieeen. we hebben recepten voor ovenschotels, pasta, plaattaarten, mexicaans, etc., en we willen een door de verschillende categorieen rouleren door de weken. Dus stel we hebben 6 categorieeen en we koken 3x/week, dan gaan we elke 2 weken door alle categorieen. Elke categorie heeft weer meerdere recepten. 

Eisen:
* een recept heeft:
    - foto (uploaden naar supabase)
    - ingedrienten: hoeveelheid, eenheid, naam (structured zodat ze samengevoegd kunnen worden over meerdere recepten, simpelweg op naam-string matchen)
    - categorie
    - kookinstructies
    - link naar originele recept website (meestal allerhande of leukerecepten.nl)
    - notities
    - laatst gekookt datum
* systeem waarbij je per week een aantal recepten gesuggereerd krijgt die passen bij de volgende categorieeen die aan de beurt zijn.
  - evt andere recepten kiezen
  - aantal recepten voor die week kunnen kiezen en per recept voor hoeveel personen het is
    - standaard 3 recepten per week met 6 personen per recept
    - kan dus ook zijn dat er deze week 0 recepten gekozen worden (bij een vakantie bv)
    - standaardhoeveelheden aan te passen in instellingen-pagina
  - copy-paste mogelijkheid voor de set recepten, waarbij de ingedrienten samengevoegd worden
    dwz: er zijn 3 recepten waar 2 uien in moeten, dan moeten er 6 uien op het lijstje wat je copy-paste komen. platte tekst zonder verdere opmaak.
  - categorieen volgorde is: minst recente is de volgende. je kunt de komende volgorde aanpassen van de recepten. dus stel nu is mexicaans aan de beurt en je kiest ipv daarvoor voor pasta, dan wordt pasta degene die hierna het laatst aan de beurt is. oftewel: door een aanpassing voor deze week schuift de rest ook door.
    implicatie is dus: een categorie met meer recepten zorgt ervoor dat die recepten minder vaak aan de beurt komen in vergelijking met categorieën met minder recepten. elke categorie komt even vaak voor, elk recept dus niet.
  - binnen categorie hetzelfde systeem van minst recent gekookt is de volgende
  - recepten af kunnen vinken om aan te geven dat je ze ook echt gekookt hebt.
* lijst recepten beheren
  - recepten visueel aan te passen in de SPA
  - hoeveelheden per persoon; dus kunnen instellen voor het hele recept: voor 6 personen, of: voor 4 personen
  - categorieen toevoegen, hernoemen en verwijderen mogelijk via de UI. let op: bij hernoemen moeten de recepten met deze categorie wel de categorie blijven bevatten, dus een categorie heeft een onveranderelijke, unieke id, en daarnaast de naam.
* recepten kunnen toevoegen van willekeurige site met ai. dus makkelijk door een agent te doen. agent skill aanmaken.
  - dit is gewoon een skill file die ik kan aanroepen vanuit vscode, niet een onderdeel van de app an sich 
  - db view waarbij je alle gebruikte ingedrienten over alle recepten kunt zien, zodat de agent makkelijk kan zien of de naam van een ingedrient al voorkomt zodat ie dezelfde string kan gebruiken, zodat deduplicatie van ingedrienten over meerdere recepten goed gaat
  - na toevoegen overzicht geven van wat er toegevoegd is zodat mens het kan controleren
* meerdere gebruikers die kunnen inloggen, aanpassingen maken, etc
  - invite-only link waarbij je naam + wachtwoord opgeeft
  - alle gebruikers mogen alles, het is alleen ter identificatie en om te voorkomen dat niet-huishouden mensen kunnen inloggen op de SPA en de boel ontregelen
  - er zijn geen per-gebruiker instellingen of voorkeuren

Stack:
- SPA op Github pages gehost met vite, react router, react-query, supabase-client
- backend op supabase

gebruik bestaande npm libraries waar dat handig is ipv alles van scratch te maken.
