// fetch-weather.js
// Runs daily via GitHub Actions — fetches all district + store weather data
// and saves to weather.json for the dashboard to load instantly

const fs = require('fs');

const API_KEY = 'VzzMRqauyjq0RBu0';
const DELAY_MS = 300; // small pause between requests to be safe

// ── Date helpers ──────────────────────────────────────────────────────────
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getDateRange() {
  const today = new Date();
  return {
    start26: fmtDate(today),
    end26:   fmtDate(addDays(today, 6)),
    start25: fmtDate(addDays(today, -365)),
    end25:   fmtDate(addDays(today, -359)),
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Districts ─────────────────────────────────────────────────────────────
const DISTRICTS = [
  { district:28, name:'Kansas City, MO',   lat:39.0997, lon:-94.5786 },
  { district:33, name:'Memphis, TN',        lat:35.1495, lon:-90.0490 },
  { district:34, name:'Oklahoma City, OK',  lat:35.4676, lon:-97.5164 },
  { district:36, name:'Atlanta, GA (36)',   lat:33.7490, lon:-84.3880 },
  { district:37, name:'Atlanta, GA (37)',   lat:33.7490, lon:-84.3880 },
  { district:38, name:'Chicago, IL',        lat:41.8781, lon:-87.6298 },
  { district:39, name:'Cleveland, OH',      lat:41.4993, lon:-81.6944 },
  { district:40, name:'Charlotte, NC',      lat:35.2271, lon:-80.8431 },
  { district:41, name:'Virginia Beach, VA', lat:36.8529, lon:-75.9780 },
  { district:42, name:'Nashville, TN',      lat:36.1627, lon:-86.7816 },
  { district:43, name:'Boston, MA',         lat:42.3601, lon:-71.0589 },
  { district:44, name:'Baltimore, MD',      lat:39.2904, lon:-76.6122 },
  { district:46, name:'Long Island, NY',    lat:40.7891, lon:-73.1350 },
  { district:47, name:'Philadelphia, PA',   lat:39.9526, lon:-75.1652 },
  { district:49, name:'Brick, NJ',          lat:40.0584, lon:-74.1099 },
  { district:51, name:'Stamford, CT',       lat:41.0534, lon:-73.5387 },
];

// ── Store lists by district ───────────────────────────────────────────────
const STORE_DISTRICTS = {
  28: [
    { store:'Store 58',   address:'1168 W 103rd St., KC, MO 64114',            lat:39.0231, lon:-94.5786 },
    { store:'Store 61',   address:'4725 E Central Ave, Wichita, KS 67208',     lat:37.6872, lon:-97.3035 },
    { store:'Store 363',  address:'4201 S Noland Rd., Independence, MO 64055', lat:39.0917, lon:-94.4152 },
    { store:'Store 447',  address:'2721 Oak View Dr, Omaha, NE 68144',         lat:41.2348, lon:-96.0673 },
    { store:'Store 467',  address:'4100 University Ave, West Des Moines 50266',lat:41.5772, lon:-93.7114 },
    { store:'Store 613',  address:'14970 W 119th St., Olathe, KS 66062',       lat:38.8814, lon:-94.8191 },
    { store:'Store 637',  address:'12111 W Maple St, Wichita, KS 67235',       lat:37.7044, lon:-97.4369 },
    { store:'Store 846',  address:'8936 N Skyview Ave, KC, MO 64154',          lat:39.2198, lon:-94.5786 },
    { store:'Store 859',  address:'607 US-40, Blue Springs, MO 64014',         lat:39.0170, lon:-94.2746 },
    { store:'Store 899',  address:'615 N Belt Hwy, St. Joseph, MO 64506',      lat:39.7675, lon:-94.8467 },
    { store:'Store 989',  address:'1570 SW Wanamaker Rd., Topeka, KS 66604',   lat:39.0473, lon:-95.6752 },
    { store:'Store 1051', address:'8668 NE Flintlock Rd., KC, MO 64157',       lat:39.2501, lon:-94.4951 },
    { store:'Store 1068', address:'2307 N Rock Rd., Derby, KS 67037',          lat:37.5534, lon:-97.2689 },
  ],
  33: [
    { store:'Store 1052', address:'1207 Water Tower Pl, Arnold MO 63010',      lat:38.4334, lon:-90.3651 },
    { store:'Store 1076', address:'301 Winding Woods Ctr, Wentzville MO 63366',lat:38.8114, lon:-90.8529 },
    { store:'Store 187',  address:'3829 Lemay Ferry Rd, St. Louis MO 63125',   lat:38.5201, lon:-90.3498 },
    { store:'Store 204',  address:'6216 Stage Rd, Memphis TN 38134',           lat:35.1987, lon:-89.9143 },
    { store:'Store 342',  address:'4111 N Cloverleaf Dr, Wentzville MO 63376', lat:38.8114, lon:-90.8529 },
    { store:'Store 347',  address:'15545 Manchester Rd, Ballwin MO 63011',     lat:38.5948, lon:-90.5463 },
    { store:'Store 38',   address:'12310 Manchester Rd, St. Louis MO 63131',   lat:38.5887, lon:-90.5143 },
    { store:'Store 441',  address:'1941 E Independence St, Springfield MO 65804', lat:37.1956, lon:-93.2679 },
    { store:'Store 453',  address:'4227 E McCain Blvd, Little Rock AR 72117',  lat:34.7831, lon:-92.2071 },
    { store:'Store 478',  address:'875 W Poplar Ave, Collierville TN 38017',   lat:35.0484, lon:-89.7298 },
    { store:'Store 50',   address:'7850 Poplar Ave, Germantown TN 38138',      lat:35.0748, lon:-89.9143 },
    { store:'Store 636',  address:'801 S Bowman Rd, Little Rock AR 72211',     lat:34.7465, lon:-92.3854 },
    { store:'Store 725',  address:'8500 Phoenix Ave, Fort Smith AR 72903',     lat:35.3495, lon:-94.3285 },
    { store:'Store 852',  address:'5218 Goodman Rd, Olive Branch MS 38654',    lat:34.9543, lon:-89.9932 },
    { store:'Store 876',  address:'8 Stonebridge Blvd, Jackson TN 38305',      lat:35.6148, lon:-88.7784 },
    { store:'Store 900',  address:'3952 N Gloster St, Tupelo MS 38804',        lat:34.2693, lon:-88.6923 },
    { store:'Store 903',  address:'863 Mount Moriah Rd, Memphis TN 38117',     lat:35.1201, lon:-90.0143 },
    { store:'Store 960',  address:'9020 US Highway 64, Lakeland TN 38002',     lat:35.2459, lon:-89.8254 },
  ],
  34: [
    { store:'Store 1072', address:'137 N Mustang Rd, Mustang OK 73064',        lat:35.3845, lon:-97.7245 },
    { store:'Store 1502', address:'2500 S I-35 Service Rd, Moore OK 73160',    lat:35.3395, lon:-97.4867 },
    { store:'Store 225',  address:'7175 S Mingo Rd, Tulsa OK 74133',           lat:36.0401, lon:-95.8476 },
    { store:'Store 269',  address:'216 S Bryant Ave, Edmond OK 73034',         lat:35.6528, lon:-97.4781 },
    { store:'Store 311',  address:'676 Ed Noble Pkwy, Norman OK 73072',        lat:35.2226, lon:-97.4395 },
    { store:'Store 32',   address:'4516 NW 63rd St, Oklahoma City OK 73132',   lat:35.5312, lon:-97.6121 },
    { store:'Store 422',  address:'4011 NW Cache Rd, Lawton OK 73505',         lat:34.6036, lon:-98.3959 },
    { store:'Store 432',  address:'800 SW 89th St, Oklahoma City OK 73139',    lat:35.4132, lon:-97.5143 },
    { store:'Store 54',   address:'3233 S Harvard Ave, Tulsa OK 74135',        lat:36.0876, lon:-95.9143 },
    { store:'Store 670',  address:'2520 W Memorial Rd, Oklahoma City OK 73134',lat:35.5901, lon:-97.5143 },
    { store:'Store 671',  address:'9021 N 121st E Ave, Owasso OK 74055',       lat:36.2695, lon:-95.8547 },
    { store:'Store 694',  address:'1600 Garth Brooks Blvd, Yukon OK 73099',    lat:35.5067, lon:-97.7617 },
    { store:'Store 727',  address:'6309 S Elm Pl, Broken Arrow OK 74011',      lat:36.0526, lon:-95.7975 },
    { store:'Store 760',  address:'7014 SE 15th St, Oklahoma City OK 73110',   lat:35.4451, lon:-97.4143 },
    { store:'Store 766',  address:'3985 OK-97, Sand Springs OK 74063',         lat:36.1395, lon:-96.1078 },
    { store:'Store 817',  address:'2401 12th Ave NW, Ardmore OK 73401',        lat:34.1743, lon:-97.1436 },
    { store:'Store 825',  address:'251 E Waterloo Rd, Edmond OK 73034',        lat:35.6528, lon:-97.4781 },
    { store:'Store 826',  address:'12307 N Rockwell Ave, Oklahoma City OK 73142', lat:35.5901, lon:-97.6121 },
    { store:'Store 834',  address:'12150 Vancouver Ave, Glenpool OK 74033',    lat:35.9473, lon:-96.0039 },
    { store:'Store 878',  address:'611 NW 32nd St, Newcastle OK 73065',        lat:35.2423, lon:-97.5992 },
    { store:'Store 882',  address:'3805 Washington Pl, Bartlesville OK 74006', lat:36.7473, lon:-95.9808 },
    { store:'Store 909',  address:'5503 W Owen K Garriott Rd, Enid OK 73703',  lat:36.3956, lon:-97.8784 },
  ],
  36: [
    { store:'Store 43',   address:'263 Hilderbrand, Atlanta GA 30329',         lat:33.8101, lon:-84.3276 },
    { store:'Store 53',   address:'7626 Memorial Pkwy SW, Huntsville AL 35802',lat:34.6626, lon:-86.5294 },
    { store:'Store 329',  address:'1355 East-West Connector, Austell GA 30106',lat:33.8123, lon:-84.6377 },
    { store:'Store 345',  address:'2404 Virginia Beach Blvd, Virginia Beach VA 23454', lat:36.8201, lon:-76.0498 },
    { store:'Store 376',  address:'10502 Alpharetta Hwy, Roswell GA 30076',    lat:34.0232, lon:-84.3616 },
    { store:'Store 400',  address:'1401 Johnson Ferry Rd, Marietta GA 30062',  lat:33.9376, lon:-84.5654 },
    { store:'Store 504',  address:'9745 Highway 92, Woodstock GA 30188',       lat:34.1015, lon:-84.5194 },
    { store:'Store 583',  address:'3405 Dallas Hwy, Marietta GA 30064',        lat:33.9376, lon:-84.5654 },
    { store:'Store 587',  address:'5805 State Bridge Rd, Duluth GA 30097',     lat:33.9793, lon:-84.1449 },
    { store:'Store 639',  address:'12850 Highway 9 N, Alpharetta GA 30004',    lat:34.0754, lon:-84.2941 },
    { store:'Store 642',  address:'3335 Cobb Pkwy NW, Acworth GA 30101',       lat:34.0662, lon:-84.6763 },
    { store:'Store 672',  address:'1680 Mall of Georgia Blvd, Buford GA 30519',lat:34.1193, lon:-83.9910 },
    { store:'Store 673',  address:'1975 Dawsonville Hwy, Gainesville GA 30501',lat:34.2979, lon:-83.8241 },
    { store:'Store 771',  address:'425 Peachtree Pkwy, Cumming GA 30041',      lat:34.2073, lon:-84.1402 },
    { store:'Store 772',  address:'7754 Spalding Dr, Peachtree Corners GA 30092', lat:33.9698, lon:-84.2216 },
    { store:'Store 851',  address:'7830 Highway 72 W, Madison AL 35758',       lat:34.6993, lon:-86.7483 },
    { store:'Store 879',  address:'2900 Delk Rd, Marietta GA 30067',           lat:33.9376, lon:-84.5654 },
    { store:'Store 1085', address:'3455 Peachtree Pkwy, Suwanee GA 30024',     lat:34.0490, lon:-84.0716 },
    { store:'Store 3007', address:'2924B Amwiler Rd, Atlanta GA 30360',        lat:33.8901, lon:-84.3101 },
  ],
  37: [
    { store:'Store 102',  address:'1588 Montgomery Hwy, Hoover AL',            lat:33.4052, lon:-86.8114 },
    { store:'Store 212',  address:'2725 Eastern Blvd, Montgomery AL',          lat:32.3668, lon:-86.2999 },
    { store:'Store 316',  address:'191 Jonesboro Rd, McDonough GA',            lat:33.4473, lon:-84.1468 },
    { store:'Store 317',  address:'5222 North Henry Blvd, Stockbridge GA',     lat:33.5396, lon:-84.2313 },
    { store:'Store 320',  address:'400 Stonewall Ave W, Fayetteville GA',      lat:33.4490, lon:-84.4549 },
    { store:'Store 365',  address:'1708 Scenic Hwy N, Snellville GA',          lat:33.8573, lon:-84.0194 },
    { store:'Store 418',  address:'2522 Dawson Rd, Albany GA',                 lat:31.5785, lon:-84.1557 },
    { store:'Store 428',  address:'5370 Stone Mountain Hwy, Stone Mountain GA',lat:33.8082, lon:-84.1702 },
    { store:'Store 431',  address:'6440 W Hamilton Park Dr, Columbus GA',      lat:32.4610, lon:-84.9877 },
    { store:'Store 620',  address:'428 Crosstown Dr, Peachtree City GA',       lat:33.3965, lon:-84.5949 },
    { store:'Store 651',  address:'5880 Trussville Crossing Blvd, Birmingham AL', lat:33.5186, lon:-86.8104 },
    { store:'Store 697',  address:'2975 N Druid Hills Rd, Atlanta GA',         lat:33.7762, lon:-84.3271 },
    { store:'Store 723',  address:'1111 Bullsboro Dr, Newnan GA',              lat:33.3807, lon:-84.7997 },
    { store:'Store 762',  address:'2270 Salem Rd SE, Conyers GA',              lat:33.6673, lon:-84.0177 },
    { store:'Store 808',  address:'2985 Chapel Hill Rd, Douglasville GA',      lat:33.7515, lon:-84.7477 },
    { store:'Store 892',  address:'4375 Forsyth Rd, Macon GA',                 lat:32.8407, lon:-83.6324 },
  ],
  38: [
    { store:'Store 56',   address:'7211 N Keystone Ave, Indianapolis IN 46240',lat:39.8700, lon:-86.1381 },
    { store:'Store 165',  address:'257 E Coliseum Blvd, Fort Wayne IN 46909',  lat:41.0793, lon:-85.1394 },
    { store:'Store 171',  address:'7565 US 31 S, Indianapolis IN 46227',       lat:39.6534, lon:-86.1420 },
    { store:'Store 385',  address:'9521 S Cicero Ave, Oak Lawn IL 60453',      lat:41.7197, lon:-87.7478 },
    { store:'Store 389',  address:'324 W Roosevelt Rd, Lombard IL 60148',      lat:41.8800, lon:-88.0076 },
    { store:'Store 410',  address:'771 E Dundee Rd, Palatine IL 60074',        lat:42.1103, lon:-88.0342 },
    { store:'Store 411',  address:'15923 Harlem Ave, Tinley Park IL 60477',    lat:41.5731, lon:-87.7931 },
    { store:'Store 415',  address:'1215 US Hwy 41, Schererville IN 46375',     lat:41.4789, lon:-87.4267 },
    { store:'Store 484',  address:'5666 Grape Rd, Mishawaka IN 46545',         lat:41.6620, lon:-86.1581 },
    { store:'Store 612',  address:'485 S Route 59, Aurora IL 60504',           lat:41.7606, lon:-88.3201 },
    { store:'Store 619',  address:'14641 US 31 N, Carmel IN 46032',            lat:39.9784, lon:-86.1180 },
    { store:'Store 640',  address:'369 W Army Trail Rd, Bloomingdale IL 60108',lat:41.9500, lon:-88.0798 },
    { store:'Store 669',  address:'8600 E 96th St, Fishers IN 46032',          lat:39.9567, lon:-86.0133 },
    { store:'Store 730',  address:'835 Beachway Dr, Indianapolis IN 46224',    lat:39.7920, lon:-86.2310 },
    { store:'Store 803',  address:'502 Randall Rd, South Elgin IL 60177',      lat:42.0281, lon:-88.3120 },
    { store:'Store 853',  address:'6030 Central Ave, Portage IN 46368',        lat:41.5817, lon:-87.1765 },
    { store:'Store 962',  address:'117 S Randall Rd, Algonquin IL 60102',      lat:42.1639, lon:-88.2923 },
    { store:'Store 2107', address:'320 Industrial Dr, West Chicago IL 60185',  lat:41.8853, lon:-88.2070 },
  ],
  39: [
    { store:'Store 45',   address:'3185 Sheridan Dr, Amherst NY 14226',        lat:42.9784, lon:-78.7984 },
    { store:'Store 65',   address:'1340 W Ridge Rd, Greece NY 14615',          lat:43.2012, lon:-77.6966 },
    { store:'Store 92',   address:'29945 Orchard Lake Rd, Farmington Hills MI 48334', lat:42.4989, lon:-83.3677 },
    { store:'Store 99',   address:'3662 Rochester Rd, Troy MI 48083',          lat:42.6064, lon:-83.1498 },
    { store:'Store 134',  address:'6875 Ridge Rd, Parma OH 44129',             lat:41.3845, lon:-81.7229 },
    { store:'Store 158',  address:'749 Panorama Trl S, Rochester NY 14625',    lat:43.1248, lon:-77.5098 },
    { store:'Store 159',  address:'2700 28th St, Grand Rapids MI 49512',       lat:42.8901, lon:-85.6187 },
    { store:'Store 248',  address:'14568 Pearl Rd, Strongsville OH 44136',     lat:41.3145, lon:-81.8357 },
    { store:'Store 274',  address:'2525 South Reynolds Rd, Toledo OH 43614',   lat:41.6201, lon:-83.5876 },
    { store:'Store 287',  address:'25128 Lorain Rd, North Olmsted OH 44070',   lat:41.4151, lon:-81.9235 },
    { store:'Store 307',  address:'4962 Monroe St, Toledo OH 43623',           lat:41.6901, lon:-83.6101 },
    { store:'Store 324',  address:'5095 Transit Rd, Buffalo NY 14221',         lat:42.8864, lon:-78.8784 },
    { store:'Store 333',  address:'34658 Warren Rd, Westland MI 48185',        lat:42.3242, lon:-83.4002 },
    { store:'Store 384',  address:'3125 28th St SW, Grandville MI 49418',      lat:42.9081, lon:-85.7605 },
    { store:'Store 641',  address:'1101 Bethel Rd, Columbus OH 43220',         lat:40.0351, lon:-83.0498 },
    { store:'Store 654',  address:'84 Boardman Poland Rd, Youngstown OH 44512',lat:41.0998, lon:-80.6495 },
    { store:'Store 660',  address:'9211 Mentor Ave, Mentor OH 44060',          lat:41.6662, lon:-81.3398 },
    { store:'Store 858',  address:'5069 North Hamilton Rd, Columbus OH 43230', lat:40.0698, lon:-82.8543 },
  ],
  40: [
    { store:'Store 91',   address:'2825 Washington Rd, Augusta GA 30909',      lat:33.4735, lon:-82.0105 },
    { store:'Store 94',   address:'4402 E Independence Blvd, Charlotte NC 28505', lat:35.2123, lon:-80.7987 },
    { store:'Store 350',  address:'6185 Rivers Ave, Charleston SC 29406',      lat:32.9176, lon:-80.0831 },
    { store:'Store 366',  address:'7370 Two Notch Rd, Columbia SC 29223',      lat:34.0676, lon:-80.9076 },
    { store:'Store 381',  address:'8500 Pineville-Matthews Rd, Charlotte NC 28226', lat:35.0876, lon:-80.8543 },
    { store:'Store 420',  address:'523 Hayward Rd, Greenville SC 29607',       lat:34.8376, lon:-82.3654 },
    { store:'Store 634',  address:'260 Harbison Blvd, Columbia SC 29212',      lat:34.0676, lon:-81.1698 },
    { store:'Store 635',  address:'4010 Smith Corners Blvd, Charlotte NC 28269', lat:35.3512, lon:-80.8101 },
    { store:'Store 659',  address:'1925 Savannah Hwy, Charleston SC 29407',    lat:32.7765, lon:-79.9311 },
    { store:'Store 681',  address:'9721 E Independence Blvd, Matthews NC 28105', lat:35.1268, lon:-80.7134 },
    { store:'Store 709',  address:'1211 N Main St, Summerville SC 29483',      lat:33.0185, lon:-80.1756 },
    { store:'Store 735',  address:'339B Harrison Bridge Rd, Simpsonville SC 29680', lat:34.7376, lon:-82.2540 },
    { store:'Store 786',  address:'1125 Johnnie Dodds Blvd, Mount Pleasant SC 29464', lat:32.8323, lon:-79.8284 },
    { store:'Store 835',  address:'7750 Warren H Abernathy Hwy, Spartanburg SC 29301', lat:34.9496, lon:-81.9321 },
    { store:'Store 841',  address:'3090 East Franklin Blvd, Gastonia NC 28056',lat:35.2621, lon:-81.1873 },
    { store:'Store 847',  address:'4324 Washington Rd, Evans GA 30809',        lat:33.5371, lon:-82.1321 },
    { store:'Store 867',  address:'601 River Hwy, Mooresville NC 28117',       lat:35.5846, lon:-80.8101 },
    { store:'Store 920',  address:'8027 Kingston Pike, Knoxville TN 37919',    lat:35.9606, lon:-83.9207 },
    { store:'Store 921',  address:'741 Louisville Rd, Alcoa TN 37701',         lat:35.7895, lon:-84.0016 },
  ],
  41: [
    { store:'Store 051',  address:'6414 E Virginia Beach Blvd, Norfolk VA 23502', lat:36.8508, lon:-76.2859 },
    { store:'Store 344',  address:'836 Eden Way N, Chesapeake VA 23320',       lat:36.7682, lon:-76.2875 },
    { store:'Store 445',  address:'1037 Hanes Mall Blvd, Winston-Salem NC 27103', lat:36.0987, lon:-80.3154 },
    { store:'Store 452',  address:'12233 Jefferson Ave, Newport News VA 23602',lat:37.0871, lon:-76.4730 },
    { store:'Store 466',  address:'6641 Falls of Neuse Rd, Raleigh NC 27615',  lat:35.9201, lon:-78.6543 },
    { store:'Store 479',  address:'7601 W Broad St, Henrico VA 23294',         lat:37.5538, lon:-77.3197 },
    { store:'Store 663',  address:'4212 W Wendover Ave, Greensboro NC 27407',  lat:36.0726, lon:-79.7920 },
    { store:'Store 710',  address:'223 Crossroads Blvd, Cary NC 27518',        lat:35.7915, lon:-78.7811 },
    { store:'Store 722',  address:'330 S College Rd, Wilmington NC 28403',     lat:34.2257, lon:-77.9447 },
    { store:'Store 732',  address:'729 Battlefield Blvd, Chesapeake VA 23322', lat:36.7101, lon:-76.2543 },
    { store:'Store 761',  address:'1030 S Main St, Kernersville NC 27284',     lat:36.1196, lon:-80.0745 },
    { store:'Store 799',  address:'4512 Princess Anne Rd, Virginia Beach VA 23462', lat:36.8201, lon:-76.0498 },
    { store:'Store 854',  address:'2217 Upton Dr, Virginia Beach VA 23454',    lat:36.8201, lon:-76.0498 },
    { store:'Store 855',  address:'3200 Academy Ave, Portsmouth VA 23703',     lat:36.8354, lon:-76.2983 },
    { store:'Store 870',  address:'181 Glensford Dr, Fayetteville NC 28314',   lat:35.0527, lon:-78.8784 },
    { store:'Store 938',  address:'7454 Tidewater Dr, Norfolk VA 23505',       lat:36.9201, lon:-76.2859 },
    { store:'Store 952',  address:'11382 Midlothian Tpke, Richmond VA 23235',  lat:37.5109, lon:-77.5876 },
    { store:'Store 1505', address:'3710 S College Rd, Wilmington NC 28412',    lat:34.1876, lon:-77.9087 },
  ],
  42: [
    { store:'Store 40',   address:'9800 Shelbyville Rd, Louisville KY 40223',  lat:38.2527, lon:-85.7585 },
    { store:'Store 80',   address:'9721 Kenwood Rd, Blue Ash OH 45242',        lat:39.2320, lon:-84.3783 },
    { store:'Store 186',  address:'5038 Glencrossing Way, Cincinnati OH 45238',lat:39.1031, lon:-84.5120 },
    { store:'Store 276',  address:'9796 Colerain Ave, Cincinnati OH 45251',    lat:39.2501, lon:-84.6101 },
    { store:'Store 315',  address:'8000 Dixie Hwy, Louisville KY 40258',       lat:38.1501, lon:-85.8101 },
    { store:'Store 326',  address:'25 Prestige Plaza Dr, Miamisburg OH 45342', lat:39.6428, lon:-84.2913 },
    { store:'Store 353',  address:'550 Ohio Pike, Cincinnati OH 45255',        lat:39.0701, lon:-84.3901 },
    { store:'Store 378',  address:'159 N Burkardt Rd, Evansville IN 47715',    lat:37.9716, lon:-87.5711 },
    { store:'Store 421',  address:'7130 Preston Hwy, Louisville KY 40219',     lat:38.1187, lon:-85.7101 },
    { store:'Store 446',  address:'130 W Tiverton Way, Lexington KY 40503',    lat:38.0406, lon:-84.5037 },
    { store:'Store 647',  address:'1050 Glenbrook Way, Hendersonville TN 37075', lat:36.3048, lon:-86.6200 },
    { store:'Store 763',  address:'3343 Princeton Rd, Hamilton OH 45011',      lat:39.3995, lon:-84.5613 },
    { store:'Store 823',  address:'7564 Voice of America Dr, West Chester OH 45069', lat:39.3559, lon:-84.4046 },
    { store:'Store 877',  address:'2445 Memorial Blvd, Murfreesboro TN 37129', lat:35.8456, lon:-86.3903 },
    { store:'Store 915',  address:'300 Pleasant Grove Rd, Mount Juliet TN 37122', lat:36.2001, lon:-86.5186 },
    { store:'Store 922',  address:'1625 Campbell Lane, Bowling Green KY 42104',lat:36.9685, lon:-86.4808 },
    { store:'Store 939',  address:'615 Bakers Bridge Ave, Franklin TN 37067',  lat:35.9251, lon:-86.8689 },
    { store:'Store 959',  address:'73 White Bridge Pike, Nashville TN 37205',  lat:36.1627, lon:-86.7816 },
    { store:'Store 971',  address:'1370 Veterans Pkwy, Clarksville IN 47129',  lat:38.3218, lon:-85.7641 },
  ],
  43: [
    { store:'Store 107',  address:'709 Queen St, Southington CT 06489',        lat:41.5965, lon:-72.8776 },
    { store:'Store 151',  address:'464 Boston Post Rd, Orange CT 06477',       lat:41.2787, lon:-73.0273 },
    { store:'Store 160',  address:'3221 Berlin Tpke, Newington CT 06111',      lat:41.6976, lon:-72.7315 },
    { store:'Store 169',  address:'120 Main St, Weymouth MA 02188',            lat:42.2168, lon:-70.9410 },
    { store:'Store 192',  address:'8 Newbury St, Danvers MA 01923',            lat:42.5751, lon:-70.9300 },
    { store:'Store 213',  address:'87 Boston Tpke, Shrewsbury MA 01545',       lat:42.2954, lon:-71.7190 },
    { store:'Store 246',  address:'91 Hale Rd, Manchester CT 06042',           lat:41.7759, lon:-72.5215 },
    { store:'Store 273',  address:'121 Elm St, Enfield CT 06082',              lat:41.9762, lon:-72.5918 },
    { store:'Store 282',  address:'876 Boston Rd, Billerica MA 01821',         lat:42.5584, lon:-71.2689 },
    { store:'Store 285',  address:'1089 Bald Hill Rd, Warwick RI 02886',       lat:41.7001, lon:-71.4162 },
    { store:'Store 304',  address:'526 S Broadway, Salem NH 03079',            lat:42.7898, lon:-71.2006 },
    { store:'Store 306',  address:'1258 S Broad St, Wallingford CT 06492',     lat:41.4573, lon:-72.8232 },
    { store:'Store 343',  address:'272 Columbia Rd, Hanover MA 02339',         lat:42.1126, lon:-70.8134 },
    { store:'Store 406',  address:'100 Cahill Ave, Manchester NH 03103',       lat:42.9956, lon:-71.4548 },
    { store:'Store 486',  address:'1335 Boston-Providence Tpke, Norwood MA 02062', lat:42.1945, lon:-71.1995 },
    { store:'Store 724',  address:'760 Worcester Rd, Framingham MA 01702',     lat:42.2793, lon:-71.4162 },
    { store:'Store 743',  address:'454 Bridgeport Ave, Milford CT 06460',      lat:41.2223, lon:-73.0573 },
    { store:'Store 744',  address:'2852 Main St, Glastonbury CT 06033',        lat:41.7026, lon:-72.6082 },
    { store:'Store 765',  address:'1285 Belmont St, Brockton MA 02301',        lat:42.0834, lon:-71.0184 },
    { store:'Store 833',  address:'123 Farmington Ave, Bristol CT 06010',      lat:41.6718, lon:-72.9493 },
    { store:'Store 905',  address:'185 Washington St, Attleboro MA 02703',     lat:41.9445, lon:-71.2956 },
    { store:'Store 950',  address:'293 Daniel Webster Hwy, Nashua NH 03060',   lat:42.7654, lon:-71.4676 },
    { store:'Store 1054', address:'38 Pershing Dr, Derby CT 06418',            lat:41.3201, lon:-73.0873 },
  ],
  44: [
    { store:'Store 103',  address:'8131 Ritchie Hwy, MD 21122',                lat:39.1501, lon:-76.6301 },
    { store:'Store 1071', address:'1142 Pulaski Hwy, DE 19701',                lat:39.5840, lon:-75.7310 },
    { store:'Store 108',  address:'5200 Nicholson Ln, MD 20895',               lat:39.0331, lon:-77.0510 },
    { store:'Store 1097', address:'200 Grove Ln, DE 19711',                    lat:39.7310, lon:-75.7468 },
    { store:'Store 156',  address:'412 Maple Ave E, VA 22180',                 lat:38.9001, lon:-77.1543 },
    { store:'Store 167',  address:'580 Baltimore Pike, MD 21014',              lat:39.5345, lon:-76.3398 },
    { store:'Store 170',  address:'13910 Shoppers Best Way, VA 22192',         lat:38.6301, lon:-77.3201 },
    { store:'Store 207',  address:'4723 Kirkwood Hwy, DE 19808',               lat:39.7198, lon:-75.7143 },
    { store:'Store 219',  address:'4113 Wholesale Club Dr, MD 21236',          lat:39.3701, lon:-76.5198 },
    { store:'Store 3018', address:'300 Commodore Dr, NJ 08085',                lat:39.7531, lon:-75.3543 },
    { store:'Store 303',  address:'3864 Union Deposit Rd, PA 17109',           lat:40.2901, lon:-76.8198 },
    { store:'Store 359',  address:'1211 Merritt Blvd, MD 21222',               lat:39.2565, lon:-76.5128 },
    { store:'Store 382',  address:'984 Loucks Rd, PA 17404',                   lat:39.9501, lon:-76.7465 },
    { store:'Store 407',  address:'1285 Manheim Pike, PA 17601',               lat:40.0501, lon:-76.3498 },
    { store:'Store 824',  address:'10029 York Rd, MD 21030',                   lat:39.5751, lon:-76.6543 },
    { store:'Store 829',  address:'9970 Liberia Ave, VA 20110',                lat:38.7501, lon:-77.4543 },
    { store:'Store 861',  address:'1450 Ritchie Hwy, MD 21012',                lat:39.1501, lon:-76.6301 },
    { store:'Store 866',  address:'5517 Carlisle Pike, PA 17050',              lat:40.2501, lon:-77.0198 },
    { store:'Store 891',  address:'400 Englar Rd, MD 21157',                   lat:39.5801, lon:-77.0143 },
    { store:'Store 928',  address:'7607 Richmond Hwy, VA 22306',               lat:38.7401, lon:-77.0798 },
    { store:'Store 942',  address:'913 Reisterstown Rd, MD 21208',             lat:39.4501, lon:-76.7798 },
  ],
  46: [
    { store:'Store 1069', address:'Freeport NY 11520',   lat:40.6443, lon:-73.5832 },
    { store:'Store 150',  address:'Greenvale NY 11548',  lat:40.7965, lon:-73.6287 },
    { store:'Store 1509', address:'Hicksville NY 11801', lat:40.7682, lon:-73.5254 },
    { store:'Store 188',  address:'Lynbrook NY 11563',   lat:40.6565, lon:-73.6743 },
    { store:'Store 275',  address:'Huntington NY 11746', lat:40.8093, lon:-73.3932 },
    { store:'Store 279',  address:'Wantagh NY 11793',    lat:40.6826, lon:-73.5154 },
    { store:'Store 35',   address:'Levittown NY 11756',  lat:40.7265, lon:-73.5143 },
    { store:'Store 379',  address:'Lindenhurst NY 11757',lat:40.6826, lon:-73.3665 },
    { store:'Store 414',  address:'Port Jefferson Station NY 11776', lat:40.9143, lon:-73.0487 },
    { store:'Store 588',  address:'Shirley NY 11967',    lat:40.7626, lon:-72.8654 },
    { store:'Store 589',  address:'East Islip NY 11730', lat:40.7276, lon:-73.1876 },
    { store:'Store 621',  address:'Smithtown NY 11787',  lat:40.8593, lon:-73.2054 },
    { store:'Store 63',   address:'Commack NY 11725',    lat:40.8462, lon:-73.2765 },
    { store:'Store 696',  address:'Syosset NY 11791',    lat:40.8276, lon:-73.5043 },
    { store:'Store 705',  address:'Patchogue NY 11772',  lat:40.7687, lon:-73.0165 },
    { store:'Store 742',  address:'Rocky Point NY 11778',lat:40.9243, lon:-72.9176 },
    { store:'Store 746',  address:'New Hyde Park NY 11040', lat:40.7398, lon:-73.6876 },
    { store:'Store 95',   address:'Sayville NY 11782',   lat:40.7376, lon:-73.1043 },
    { store:'Store 96',   address:'Centereach NY 11720', lat:40.9087, lon:-73.0376 },
    { store:'Store 970',  address:'East Northport NY 11731', lat:40.8793, lon:-73.3265 },
  ],
  47: [
    { store:'Store 122',  address:'2326 MacArthur Rd, Whitehall Township PA 18052', lat:40.6501, lon:-75.4698 },
    { store:'Store 124',  address:'831 Lancaster Ave, Wayne PA 19087',         lat:40.0415, lon:-75.3824 },
    { store:'Store 155',  address:'762 Bethlehem Pike, North Wales PA 19454',  lat:40.2115, lon:-75.2762 },
    { store:'Store 174',  address:'260 N Pottstown Pike, Exton PA 19341',      lat:40.0284, lon:-75.6207 },
    { store:'Store 209',  address:'40 Greenfield Ave, Ardmore PA 19003',       lat:40.0076, lon:-75.2887 },
    { store:'Store 210',  address:'606 York Rd, Warminster PA 18974',          lat:40.1951, lon:-75.0887 },
    { store:'Store 211',  address:'636 Old York Rd, Jenkintown PA 19046',      lat:40.0940, lon:-75.1290 },
    { store:'Store 262',  address:'4411 Concord Pike, Wilmington DE 19803',    lat:39.7447, lon:-75.5484 },
    { store:'Store 286',  address:'679 Kidder St, Wilkes-Barre PA 18702',      lat:41.2459, lon:-75.8813 },
    { store:'Store 296',  address:'104A W Germantown Pike, Norristown PA 19401', lat:40.1215, lon:-75.3399 },
    { store:'Store 341',  address:'3801 Nazareth Pike, Bethlehem PA 18020',    lat:40.6259, lon:-75.3705 },
    { store:'Store 370',  address:'204 Shoemaker Rd, Pottstown PA 19464',      lat:40.2448, lon:-75.6496 },
    { store:'Store 395',  address:'1025 Commerce Blvd, Scranton PA 18519',     lat:41.4090, lon:-75.6624 },
    { store:'Store 655',  address:'1183 Berkshire Blvd, Reading PA 19610',     lat:40.3356, lon:-75.9269 },
    { store:'Store 758',  address:'1546 Paoli Pike, West Chester PA 19380',    lat:39.9626, lon:-75.6057 },
    { store:'Store 768',  address:'133 S West End Blvd, Quakertown PA 18951',  lat:40.4415, lon:-75.3413 },
    { store:'Store 831',  address:'3710 N Easton Rd, Doylestown PA 18902',     lat:40.3101, lon:-75.1299 },
    { store:'Store 838',  address:'789 W Sproul Rd, Springfield PA 19064',     lat:39.9309, lon:-75.3227 },
    { store:'Store 946',  address:'222 E Main St, Collegeville PA 19426',      lat:40.1776, lon:-75.4521 },
    { store:'Store 949',  address:'1091 Mill Creek Rd, Allentown PA 18106',    lat:40.6023, lon:-75.4714 },
    { store:'Store 1096', address:'703 PA-113, Souderton PA 18964',            lat:40.3148, lon:-75.3243 },
  ],
  49: [
    { store:'Store 75',   address:'201 W Street Rd, Feasterville PA 19053',    lat:40.1476, lon:-74.9613 },
    { store:'Store 113',  address:'472 State Route 35, Red Bank NJ 07701',     lat:40.3468, lon:-74.0632 },
    { store:'Store 126',  address:'268 State Route 18, East Brunswick NJ 08816', lat:40.4276, lon:-74.4174 },
    { store:'Store 135',  address:'110 Lincoln Hwy, Fairless Hills PA 19030',  lat:40.1793, lon:-74.8585 },
    { store:'Store 157',  address:'1930 State Highway 88, Brick NJ 08724',     lat:40.0584, lon:-74.1099 },
    { store:'Store 184',  address:'2070 Route 70 E, Cherry Hill NJ 08003',     lat:39.9348, lon:-75.0241 },
    { store:'Store 226',  address:'4060 US Highway 9, Howell NJ 07731',        lat:40.1851, lon:-74.1963 },
    { store:'Store 280',  address:'1013 Route 130 South, Cinnaminson NJ 08077',lat:40.0026, lon:-74.9985 },
    { store:'Store 309',  address:'3371 Brunswick Pike, Lawrenceville NJ 08648', lat:40.2987, lon:-74.7357 },
    { store:'Store 336',  address:'10 Route 37 E, Toms River NJ 08753',        lat:39.9537, lon:-74.1979 },
    { store:'Store 404',  address:'2335 Street Rd, Bensalem PA 19020',         lat:40.1040, lon:-74.9349 },
    { store:'Store 416',  address:'3681 Route 9 North, Freehold NJ 07728',     lat:40.2615, lon:-74.2729 },
    { store:'Store 425',  address:'1470 State Route 36, Hazlet NJ 07730',      lat:40.4260, lon:-74.1638 },
    { store:'Store 661',  address:'950 State Hwy 33, Trenton NJ 08690',        lat:40.2171, lon:-74.7429 },
    { store:'Store 759',  address:'415 Egg Harbor Rd, Sewell NJ 08080',        lat:39.7526, lon:-75.1435 },
    { store:'Store 832',  address:'5 Jackson Rd, Medford NJ 08055',            lat:39.8701, lon:-74.8249 },
    { store:'Store 895',  address:'297 Route 72 W, Manahawkin NJ 08050',       lat:39.6973, lon:-74.2585 },
    { store:'Store 914',  address:'1901 Route 35, Wall Township NJ 07719',     lat:40.1676, lon:-74.0596 },
    { store:'Store 1063', address:'650 W Cuthbert Blvd, Westmont NJ 08108',    lat:39.8987, lon:-75.0491 },
    { store:'Store 1083', address:'344 Main St, Lanoka Harbor NJ 08734',       lat:39.8526, lon:-74.2263 },
  ],
  51: [
    { store:'Store 109',  address:'151 Westport Ave, Norwalk CT 06851',        lat:41.1177, lon:-73.4082 },
    { store:'Store 111',  address:'1817 South Rd, Wappingers Falls NY 12590',  lat:41.5987, lon:-73.9096 },
    { store:'Store 127',  address:'579 Troy-Schenectady Rd, Latham NY 12110',  lat:42.7426, lon:-73.7579 },
    { store:'Store 148',  address:'288 Tarrytown Rd, White Plains NY 10607',   lat:41.0340, lon:-73.7629 },
    { store:'Store 149',  address:'447 NJ-17, Paramus NJ 07652',               lat:40.9448, lon:-74.0712 },
    { store:'Store 154',  address:'119 US-22, Green Brook NJ 08812',           lat:40.6048, lon:-74.4810 },
    { store:'Store 172',  address:'110 NY-59, Nanuet NY 10954',                lat:41.0873, lon:-74.0121 },
    { store:'Store 214',  address:'525 Tunxis Hill Cut Off, Fairfield CT 06825', lat:41.1415, lon:-73.2637 },
    { store:'Store 223',  address:'350 Ramapo Valley Rd, Oakland NJ 07436',    lat:41.0304, lon:-74.2335 },
    { store:'Store 239',  address:'271 US-22, Springfield NJ 07081',           lat:40.7012, lon:-74.3207 },
    { store:'Store 277',  address:'1132 US-46, Clifton NJ 07013',              lat:40.8584, lon:-74.1640 },
    { store:'Store 298',  address:'355 Universal Dr N, North Haven CT 06473',  lat:41.3915, lon:-72.8596 },
    { store:'Store 357',  address:'178 NJ-35, Eatontown NJ 07724',             lat:40.2948, lon:-74.0588 },
    { store:'Store 364',  address:'352 NJ-23, Pompton Plains NJ 07444',        lat:40.9726, lon:-74.2999 },
    { store:'Store 394',  address:'3067 US-46, Parsippany NJ 07054',           lat:40.8579, lon:-74.4254 },
    { store:'Store 721',  address:'150 N Main St, Manville NJ 08835',          lat:40.5448, lon:-74.5885 },
    { store:'Store 733',  address:'72 Newtown Rd, Danbury CT 06810',           lat:41.3948, lon:-73.4540 },
    { store:'Store 860',  address:'469 NY-211, Middletown NY 10940',           lat:41.4459, lon:-74.4229 },
    { store:'Store 947',  address:'305 West Ave, Stamford CT 06902',           lat:41.0534, lon:-73.5387 },
    { store:'Store 948',  address:'275 NJ-10, Succasunna NJ 07876',            lat:40.8551, lon:-74.6562 },
    { store:'Store 985',  address:'1300 NJ-17, Ramsey NJ 07446',               lat:41.0573, lon:-74.1424 },
    { store:'Store 1082', address:'500 S River St, Hackensack NJ 07601',       lat:40.8859, lon:-74.0435 },
  ],
};

// ── Fetch from Open-Meteo ─────────────────────────────────────────────────
async function fetchWeather(lat, lon, start, end, isArchive) {
  const base = isArchive
    ? 'https://customer-archive-api.open-meteo.com/v1/archive'
    : 'https://customer-api.open-meteo.com/v1/forecast';
  const url = `${base}?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,daylight_duration,cloud_cover_mean`
    + `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York`
    + `&apikey=${API_KEY}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetch(url);
    if (resp.status === 429) {
      await sleep((attempt + 1) * 3000);
      continue;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.reason || 'API error');

    const tMax   = data.daily?.temperature_2m_max    ?? [];
    const tMin   = data.daily?.temperature_2m_min    ?? [];
    const precip = data.daily?.precipitation_sum     ?? [];
    const daylen = data.daily?.daylight_duration     ?? [];
    const clouds = data.daily?.cloud_cover_mean      ?? [];
    const dates  = data.daily?.time                  ?? [];
    if (!tMax.length) throw new Error('Empty response');

    const days = tMax.map((mx, i) => ({
      date:  dates[i] ?? '',
      tHigh: mx,
      tLow:  tMin[i] ?? mx,
      tAvg:  (mx + (tMin[i] ?? mx)) / 2,
      rain:  precip[i] ?? 0,
      sun:   daylen[i] != null ? daylen[i] / 3600 : null,
      cloud: clouds[i] ?? null,
    }));

    const sunDays   = days.filter(d => d.sun   != null);
    const cloudDays = days.filter(d => d.cloud != null);
    return {
      avgTemp:   days.reduce((s, d) => s + d.tAvg, 0) / days.length,
      totalRain: days.reduce((s, d) => s + d.rain, 0),
      avgSun:    sunDays.length   ? sunDays.reduce((s,d)=>s+d.sun,0)/sunDays.length     : null,
      avgCloud:  cloudDays.length ? cloudDays.reduce((s,d)=>s+d.cloud,0)/cloudDays.length : null,
      days,
    };
  }
  throw new Error('Max retries exceeded');
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const { start26, end26, start25, end25 } = getDateRange();
  console.log(`Fetching weather: ${start26} to ${end26} vs ${start25} to ${end25}`);

  const output = {
    lastUpdated: new Date().toISOString(),
    dateRange: { start26, end26, start25, end25 },
    districts: [],
    stores: {},
  };

  // Build full list of all locations to fetch
  const allLocations = [];

  for (const d of DISTRICTS) {
    allLocations.push({ type: 'district', key: d.district, name: d.name, lat: d.lat, lon: d.lon });
  }
  for (const [distNum, storeList] of Object.entries(STORE_DISTRICTS)) {
    for (const s of storeList) {
      allLocations.push({ type: 'store', key: parseInt(distNum), store: s.store, address: s.address, lat: s.lat, lon: s.lon });
    }
  }

  console.log(`Total locations: ${allLocations.length}`);

  const districtMap = {};
  const storeMap = {};

  for (let i = 0; i < allLocations.length; i++) {
    const loc = allLocations[i];
    console.log(`[${i+1}/${allLocations.length}] ${loc.type === 'district' ? 'D'+loc.key+' '+loc.name : 'D'+loc.key+' '+loc.store}`);

    let w26 = null, w25 = null;
    try { w26 = await fetchWeather(loc.lat, loc.lon, start26, end26, false); }
    catch(e) { console.error(`  2026 error: ${e.message}`); }
    await sleep(DELAY_MS);

    try { w25 = await fetchWeather(loc.lat, loc.lon, start25, end25, true); }
    catch(e) { console.error(`  2025 error: ${e.message}`); }
    await sleep(DELAY_MS);

    const record = {
      temp26: w26?.avgTemp ?? null,
      rain26: w26?.totalRain ?? null,
      sun26:  w26?.avgSun ?? null,
      cloud26:w26?.avgCloud ?? null,
      days26: w26?.days ?? null,
      temp25: w25?.avgTemp ?? null,
      rain25: w25?.totalRain ?? null,
      sun25:  w25?.avgSun ?? null,
      cloud25:w25?.avgCloud ?? null,
      days25: w25?.days ?? null,
    };

    if (loc.type === 'district') {
      districtMap[loc.key] = { ...loc, ...record };
    } else {
      if (!storeMap[loc.key]) storeMap[loc.key] = [];
      storeMap[loc.key].push({ store: loc.store, address: loc.address, lat: loc.lat, lon: loc.lon, ...record });
    }
  }

  // Sort districts in order
  output.districts = DISTRICTS.map(d => ({ district: d.district, name: d.name, ...districtMap[d.district] }));
  output.stores = storeMap;

  fs.writeFileSync('weather.json', JSON.stringify(output, null, 2));
  console.log('\nDone! Saved to weather.json');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
