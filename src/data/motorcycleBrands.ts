/** Valeur sentinelle pour la marque ou le modèle : bascule le champ dropdown
 * vers une saisie libre (marque non listée, ou modèle absent du catalogue). */
export const OTHER_OPTION = 'Autre';

export const MOTORCYCLE_BRANDS: string[] = [
  'Honda',
  'Yamaha',
  'Kawasaki',
  'Suzuki',
  'BMW Motorrad',
  'Ducati',
  'KTM',
  'Triumph',
  'Aprilia',
  'Moto Guzzi',
  'Husqvarna',
  'MV Agusta',
  'Piaggio/Vespa',
  'CFMoto',
  'Voge',
  'Zontes',
  'Kove',
  'QJMotor',
  'Benda',
  'Lifan',
  'Harley-Davidson',
  'Indian Motorcycle',
  'Zero Motorcycles',
  'Energica',
  'Sur-Ron',
  'Royal Enfield',
  'Bajaj',
  'TVS',
  'Hero MotoCorp',
  OTHER_OPTION,
];

/** Modèles courants/actuels par marque - liste curatée (les plus répandus), pas
 * un catalogue historique exhaustif. "Autre" est ajouté dynamiquement par le
 * composant qui consomme cette liste, jamais stocké ici. */
export const MOTORCYCLE_MODELS_BY_BRAND: Record<string, string[]> = {
  Honda: [
    'CB125R', 'CB300R', 'CB500F', 'CB500X', 'CB650R', 'CB1000R',
    'CBR500R', 'CBR600RR', 'CBR650R', 'CBR1000RR-R Fireblade',
    'CRF250L', 'CRF300L', 'CRF300 Rally', 'CRF450L',
    'CRF1100L Africa Twin', 'Africa Twin Adventure Sports',
    'Rebel 300', 'Rebel 500', 'Rebel 1100',
    'Hornet 750', 'Hornet 1000', 'NC750X', 'X-ADV',
    'Forza 350', 'Forza 750', 'PCX125', 'SH125i',
    'Gold Wing', 'VFR800X Crossrunner', 'Monkey', 'Super Cub C125', 'Dax 125',
  ],
  Yamaha: [
    'MT-03', 'MT-07', 'MT-09', 'MT-09 SP', 'MT-10', 'MT-125',
    'XSR700', 'XSR900', 'YZF-R125', 'YZF-R3', 'YZF-R7', 'YZF-R1',
    'Ténéré 700', 'Ténéré 700 Rally Edition', 'Tracer 7', 'Tracer 9', 'Tracer 9 GT',
    'Niken', 'XMAX 300', 'NMAX 125', 'TMAX 560', 'Aerox 155',
    'WR250R', 'WR450F', 'YZ250F', 'YZ450F', 'Super Ténéré 1200',
  ],
  Kawasaki: [
    'Ninja 400', 'Ninja 500', 'Ninja 650', 'Ninja ZX-4RR', 'Ninja ZX-6R',
    'Ninja ZX-10R', 'Ninja ZX-10RR', 'Ninja H2', 'Ninja H2 SX', 'Ninja 1000SX',
    'Z400', 'Z650', 'Z900', 'Z900RS', 'Z H2',
    'Versys 650', 'Versys 1000', 'Versys-X 300',
    'KLX230', 'KLX300', 'KLR650', 'Vulcan S', 'W800',
  ],
  Suzuki: [
    'GSX-R600', 'GSX-R750', 'GSX-R1000', 'GSX-S750', 'GSX-S1000', 'GSX-S1000GT',
    'SV650', 'V-Strom 650', 'V-Strom 800DE', 'V-Strom 1050',
    'Hayabusa', 'Katana', 'Burgman 400', 'Bandit 650',
    'DR-Z400', 'RM-Z250', 'RM-Z450',
  ],
  'BMW Motorrad': [
    'R 1250 GS', 'R 1250 GS Adventure', 'R 1300 GS', 'R 1300 GS Adventure',
    'R nineT', 'R 12 nineT', 'F 750 GS', 'F 850 GS', 'F 900 R', 'F 900 XR',
    'S 1000 RR', 'S 1000 R', 'S 1000 XR', 'G 310 R', 'G 310 GS',
    'K 1600 GTL', 'C 400 X', 'CE 04',
  ],
  Ducati: [
    'Monster', 'Monster SP', 'Panigale V2', 'Panigale V4', 'Panigale V4 S',
    'Streetfighter V2', 'Streetfighter V4', 'Multistrada V2', 'Multistrada V4',
    'Diavel V4', 'XDiavel', 'Scrambler Icon', 'Scrambler 1100',
    'DesertX', 'SuperSport 950', 'Hypermotard 950',
  ],
  KTM: [
    'Duke 125', 'Duke 250', 'Duke 390', 'Duke 790', 'Duke 890', 'Duke 990',
    '1290 Super Duke R', 'RC 390', '890 Adventure', '890 Adventure R',
    '1290 Super Adventure S', '1290 Super Adventure R',
    '690 Enduro R', '690 SMC R', '450 EXC-F', '250 EXC',
  ],
  Triumph: [
    'Trident 660', 'Street Triple 765', 'Speed Triple 1200',
    'Bonneville T100', 'Bonneville T120', 'Speed Twin 900', 'Speed Twin 1200',
    'Scrambler 400 X', 'Scrambler 900', 'Scrambler 1200',
    'Tiger 900', 'Tiger 1200', 'Rocket 3', 'Daytona 660', 'Speed 400',
  ],
  Aprilia: [
    'RS 660', 'Tuono 660', 'Tuono V4', 'RSV4', 'Tuareg 660',
    'RS 457', 'SR GT 200', 'Shiver 900', 'Dorsoduro 900',
  ],
  'Moto Guzzi': ['V7', 'V9', 'V85 TT', 'V100 Mandello', 'California 1400', 'Griso'],
  Husqvarna: [
    'Svartpilen 125', 'Svartpilen 401', 'Vitpilen 401', 'Norden 901',
    'FE 350', 'FC 450', 'TE 300',
  ],
  'MV Agusta': [
    'Brutale 800', 'Brutale 1000', 'Dragster 800', 'F3 800', 'Superveloce 800', 'Turismo Veloce 800',
  ],
  'Piaggio/Vespa': [
    'Vespa Primavera', 'Vespa Sprint', 'Vespa GTS 300', 'Vespa Elettrica',
    'Piaggio Liberty', 'Piaggio MP3', 'Piaggio Beverly',
  ],
  CFMoto: ['300NK', '300SR', '450NK', '450SR', '700CL-X', '800NK', '800MT', '850NK'],
  Voge: ['300R', '300RR', '500R', '525DSX', '650DSX'],
  Zontes: ['ZT125', 'ZT310', 'ZT310-T', 'ZT350'],
  Kove: ['450 Rally', '800X'],
  QJMotor: ['SRK 250', 'SRK 400', 'SRK 600'],
  Benda: ['LFC 700', 'LFS 700'],
  Lifan: ['KPR 200', 'KPT 200'],
  'Harley-Davidson': [
    'Iron 883', 'Sportster S', 'Nightster', 'Street Bob', 'Fat Bob', 'Low Rider S',
    'Road Glide', 'Street Glide', 'Road King', 'Fat Boy', 'Heritage Classic', 'Pan America 1250',
  ],
  'Indian Motorcycle': [
    'Scout', 'Scout Bobber', 'FTR', 'Chief', 'Chieftain', 'Roadmaster', 'Springfield', 'Challenger',
  ],
  'Zero Motorcycles': ['FXE', 'FXS', 'SR/F', 'SR/S', 'DSR', 'DSR/X'],
  Energica: ['Eva Ribelle', 'Experia', 'Ego'],
  'Sur-Ron': ['Light Bee X', 'Storm Bee', 'Ultra Bee'],
  'Royal Enfield': [
    'Classic 350', 'Meteor 350', 'Hunter 350', 'Bullet 350', 'Himalayan',
    'Continental GT 650', 'Interceptor 650', 'Scram 411', 'Shotgun 650',
  ],
  Bajaj: ['Pulsar NS200', 'Pulsar RS200', 'Dominar 400', 'Avenger'],
  TVS: ['Apache RTR 160', 'Apache RR 310', 'Ronin'],
  'Hero MotoCorp': ['Xpulse 200', 'Xtreme 160R', 'Karizma XMR'],
};
