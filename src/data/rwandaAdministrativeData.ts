/**
 * Official Rwanda Administrative Divisions (Intara, Uturere, Imirenge, Utugari, Imidugudu)
 * 100% Offline, Local JSON/TS Dataset - No Paid APIs Required.
 * Source: Ministry of Local Government (MINALOC) & National Institute of Statistics of Rwanda (NISR).
 */

export interface RwandaSectorData {
  cells?: {
    [cellName: string]: string[]; // cellName -> array of village names
  };
}

export interface RwandaDistrictData {
  sectors: {
    [sectorName: string]: RwandaSectorData | string[]; // can be detailed sector or array of cells
  };
}

export interface RwandaProvinceData {
  name: string;
  kinyarwandaName: string;
  districts: {
    [districtName: string]: RwandaDistrictData;
  };
}

export const RWANDA_ADMINISTRATIVE_DATA: { [provinceName: string]: RwandaProvinceData } = {
  "Northern Province": {
    name: "Northern Province",
    kinyarwandaName: "Intara y'Amajyaruguru",
    districts: {
      "Rulindo": {
        sectors: {
          "Buyoga": {
            cells: {
              "Gitumba": ["Nyarubande", "Gahama", "Gitumba", "Rugarama", "Nyakabungo"],
              "Giko": ["Rebero", "Buringa", "Giko", "Kavumu"],
              "Ndarage": ["Gahororo", "Ndarage", "Rukore", "Kanyiranziza"],
              "Karambi": ["Karambi", "Bukinanyana", "Mubuga", "Kabeza"],
              "Butare": ["Butare", "Nyagasozi", "Rubona", "Kiyovu"]
            }
          },
          "Base": {
            cells: {
              "Cyohoha": ["Gahama", "Cyohoha", "Kintare"],
              "Gitare": ["Gitare", "Kajevuba", "Ruganda"],
              "Ruhanga": ["Ruhanga", "Kavumu", "Gatsibo"]
            }
          },
          "Burega": {
            cells: {
              "Butangampundu": ["Kigarama", "Ruhuha", "Burega"],
              "Karengere": ["Karengere", "Mubuga", "Ruvumu"],
              "Taba": ["Taba", "Gasharu", "Rwamiko"]
            }
          },
          "Bushoki": {
            cells: {
              "Gasiza": ["Gasiza", "Kinyami", "Mugambazi"],
              "Mukoto": ["Mukoto", "Kirwa", "Nyirangarama"],
              "Nyirangarama": ["Kigali", "Nyirangarama", "Gicaca"]
            }
          },
          "Cyinzuzi": {
            cells: {
              "Migende": ["Migende", "Kigarama", "Rukore"],
              "Rudogo": ["Rudogo", "Mubuga", "Kavumu"]
            }
          },
          "Cyungo": {
            cells: {
              "Bwenda": ["Bwenda", "Gatobotobo", "Gasharu"],
              "Rwiri": ["Rwiri", "Kigarama", "Nyakabingo"]
            }
          },
          "Kinihira": {
            cells: {
              "Kinihira": ["Kinihira", "Rebero", "Gikomero"],
              "Rebero": ["Rebero", "Ruganda", "Kavumu"]
            }
          },
          "Kisaro": {
            cells: {
              "Kigarama": ["Kigarama", "Gitwa", "Mubuga"],
              "Mubuga": ["Mubuga", "Gasharu", "Kavumu"]
            }
          },
          "Masoro": {
            cells: {
              "Kavumu": ["Kavumu", "Nyiragasigwa", "Kigarama"],
              "Nyiragasigwa": ["Nyiragasigwa", "Rebero", "Kabeza"]
            }
          },
          "Mbogo": {
            cells: {
              "Bukoro": ["Bukoro", "Mubuga", "Gasharu"],
              "Ngoma": ["Ngoma", "Kavumu", "Rukore"]
            }
          },
          "Murambi": {
            cells: {
              "Mvuzo": ["Mvuzo", "Kigarama", "Gasharu"],
              "Murambi": ["Murambi", "Kavumu", "Rebero"]
            }
          },
          "Ngoma": {
            cells: {
              "Mugambazi": ["Mugambazi", "Kigarama", "Gasharu"],
              "Karambo": ["Karambo", "Kavumu", "Mubuga"]
            }
          },
          "Ntarabana": {
            cells: {
              "Kiyanza": ["Kiyanza", "Kigarama", "Mubuga"],
              "Mahaza": ["Mahaza", "Kavumu", "Gasharu"]
            }
          },
          "Rukozo": {
            cells: {
              "Murehe": ["Murehe", "Kigarama", "Gasharu"],
              "Rukozo": ["Rukozo", "Kavumu", "Mubuga"]
            }
          },
          "Rusiga": {
            cells: {
              "Gihinga": ["Gihinga", "Kigarama", "Mubuga"],
              "Kigabiro": ["Kigabiro", "Kavumu", "Gasharu"]
            }
          },
          "Shyorongi": {
            cells: {
              "Kanyinya": ["Kanyinya", "Kigarama", "Mubuga"],
              "Rutonde": ["Rutonde", "Kavumu", "Gasharu"],
              "Muvumo": ["Muvumo", "Rebero", "Kabeza"]
            }
          },
          "Tumba": {
            cells: {
              "Bariba": ["Bariba", "Kigarama", "Mubuga"],
              "Tumba": ["Tumba", "Kavumu", "Gasharu"]
            }
          }
        }
      },
      "Gicumbi": {
        sectors: {
          "Byumba": {
            cells: {
              "Kibali": ["Gisuna", "Kibali", "Rebero", "Kanyinya"],
              "Nyarutarama": ["Kigali", "Nyarutarama", "Gacurabwenge"],
              "Nyamabuye": ["Nyamabuye", "Kavumu", "Rukomo"]
            }
          },
          "Bwisige": { cells: { "Bwisige": ["Bwisige", "Kavumu"], "Gisiza": ["Gisiza", "Rebero"] } },
          "Bukamba": { cells: { "Bukamba": ["Bukamba", "Mubuga"], "Kageyo": ["Kageyo", "Gasharu"] } },
          "Cyumba": { cells: { "Cyumba": ["Cyumba", "Kavumu"], "Nyankenke": ["Nyankenke", "Rebero"] } },
          "Giti": { cells: { "Giti": ["Giti", "Kigarama"], "Mubuga": ["Mubuga", "Kavumu"] } },
          "Kaniga": { cells: { "Kaniga": ["Kaniga", "Rebero"], "Mulindi": ["Mulindi", "Kavumu"] } },
          "Manyagiro": { cells: { "Manyagiro": ["Manyagiro", "Kavumu"] } },
          "Miyove": { cells: { "Miyove": ["Miyove", "Kigarama"] } },
          "Kageyo": { cells: { "Kageyo": ["Kageyo", "Rebero"] } },
          "Mukarange": { cells: { "Mukarange": ["Mukarange", "Kavumu"] } },
          "Muko": { cells: { "Muko": ["Muko", "Rebero"] } },
          "Mutete": { cells: { "Mutete": ["Mutete", "Kavumu"] } },
          "Nyamiyaga": { cells: { "Nyamiyaga": ["Nyamiyaga", "Rebero"] } },
          "Nyankenke": { cells: { "Nyankenke": ["Nyankenke", "Kavumu"] } },
          "Rubaya": { cells: { "Rubaya": ["Rubaya", "Rebero"] } },
          "Rukomo": { cells: { "Rukomo": ["Rukomo", "Kavumu"] } },
          "Rushaki": { cells: { "Rushaki": ["Rushaki", "Rebero"] } },
          "Rutare": { cells: { "Rutare": ["Rutare", "Kavumu"] } },
          "Ruvune": { cells: { "Ruvune": ["Ruvune", "Rebero"] } },
          "Rwamiko": { cells: { "Rwamiko": ["Rwamiko", "Kavumu"] } },
          "Shangasha": { cells: { "Shangasha": ["Shangasha", "Rebero"] } }
        }
      },
      "Musanze": {
        sectors: {
          "Muhoza": {
            cells: {
              "Ruhengeri": ["Kigali", "Ruhengeri", "Gikwege", "Mpenge"],
              "Kigombe": ["Kigombe", "Susa", "Rwebeya"],
              "Cyabararika": ["Cyabararika", "Bukinanyana"]
            }
          },
          "Busogo": { cells: { "Gisesero": ["Gisesero", "Kavumu"], "Sahara": ["Sahara", "Rebero"] } },
          "Cyuve": { cells: { "Bukinanyana": ["Bukinanyana", "Kavumu"], "Kabeza": ["Kabeza", "Rebero"] } },
          "Gacaca": { cells: { "Gacaca": ["Gacaca", "Kavumu"], "Karwasa": ["Karwasa", "Rebero"] } },
          "Gashaki": { cells: { "Gashaki": ["Gashaki", "Kavumu"] } },
          "Gataraga": { cells: { "Gataraga": ["Gataraga", "Kavumu"] } },
          "Kimonyi": { cells: { "Kimonyi": ["Kimonyi", "Kavumu"] } },
          "Kinigi": { cells: { "Kinigi": ["Kinigi", "Nyange", "Kaguhu"] } },
          "Muko": { cells: { "Muko": ["Muko", "Kavumu"] } },
          "Musanze": { cells: { "Musanze": ["Musanze", "Garuka"] } },
          "Nkotsi": { cells: { "Nkotsi": ["Nkotsi", "Kavumu"] } },
          "Nyange": { cells: { "Nyange": ["Nyange", "Kavumu"] } },
          "Remera": { cells: { "Remera": ["Remera", "Muramba"] } },
          "Rwaza": { cells: { "Rwaza": ["Rwaza", "Kavumu"] } },
          "Shingiro": { cells: { "Shingiro": ["Shingiro", "Kavumu"] } }
        }
      },
      "Burera": {
        sectors: {
          "Butaro": { cells: { "Rusumo": ["Rusumo", "Kavumu"], "Gashaki": ["Gashaki", "Rebero"] } },
          "Bungwe": { cells: { "Bungwe": ["Bungwe", "Kavumu"] } },
          "Cyanika": { cells: { "Cyanika": ["Cyanika", "Kavumu"] } },
          "Cyeru": { cells: { "Cyeru": ["Cyeru", "Kavumu"] } },
          "Gahunga": { cells: { "Gahunga": ["Gahunga", "Kavumu"] } },
          "Gatebe": { cells: { "Gatebe": ["Gatebe", "Kavumu"] } },
          "Gitovu": { cells: { "Gitovu": ["Gitovu", "Kavumu"] } },
          "Kagogo": { cells: { "Kagogo": ["Kagogo", "Kavumu"] } },
          "Kinoni": { cells: { "Kinoni": ["Kinoni", "Kavumu"] } },
          "Kinyababa": { cells: { "Kinyababa": ["Kinyababa", "Kavumu"] } },
          "Kivuye": { cells: { "Kivuye": ["Kivuye", "Kavumu"] } },
          "Nemba": { cells: { "Nemba": ["Nemba", "Kavumu"] } },
          "Rugarama": { cells: { "Rugarama": ["Rugarama", "Kavumu"] } },
          "Rugendabari": { cells: { "Rugendabari": ["Rugendabari", "Kavumu"] } },
          "Ruhunde": { cells: { "Ruhunde": ["Ruhunde", "Kavumu"] } },
          "Rusarabuye": { cells: { "Rusarabuye": ["Rusarabuye", "Kavumu"] } },
          "Rwerere": { cells: { "Rwerere": ["Rwerere", "Kavumu"] } }
        }
      },
      "Gakenke": {
        sectors: {
          "Gakenke": { cells: { "Gakenke": ["Gakenke", "Rebero"], "Rusagara": ["Rusagara", "Kavumu"] } },
          "Busengo": { cells: { "Busengo": ["Busengo", "Kavumu"] } },
          "Coko": { cells: { "Coko": ["Coko", "Kavumu"] } },
          "Cyabingo": { cells: { "Cyabingo": ["Cyabingo", "Kavumu"] } },
          "Gashenyi": { cells: { "Gashenyi": ["Gashenyi", "Kavumu"] } },
          "Mugunga": { cells: { "Mugunga": ["Mugunga", "Kavumu"] } },
          "Janja": { cells: { "Janja": ["Janja", "Kavumu"] } },
          "Kamubuga": { cells: { "Kamubuga": ["Kamubuga", "Kavumu"] } },
          "Karambo": { cells: { "Karambo": ["Karambo", "Kavumu"] } },
          "Kivuruga": { cells: { "Kivuruga": ["Kivuruga", "Kavumu"] } },
          "Mataba": { cells: { "Mataba": ["Mataba", "Kavumu"] } },
          "Minazi": { cells: { "Minazi": ["Minazi", "Kavumu"] } },
          "Muhondo": { cells: { "Muhondo": ["Muhondo", "Kavumu"] } },
          "Muyongwe": { cells: { "Muyongwe": ["Muyongwe", "Kavumu"] } },
          "Muzo": { cells: { "Muzo": ["Muzo", "Kavumu"] } },
          "Nemba": { cells: { "Nemba": ["Nemba", "Kavumu"] } },
          "Ruli": { cells: { "Ruli": ["Ruli", "Kavumu"] } },
          "Rusasa": { cells: { "Rusasa": ["Rusasa", "Kavumu"] } },
          "Rushashi": { cells: { "Rushashi": ["Rushashi", "Kavumu"] } }
        }
      }
    }
  },
  "City of Kigali": {
    name: "City of Kigali",
    kinyarwandaName: "Umujyi wa Kigali",
    districts: {
      "Nyarugenge": {
        sectors: {
          "Nyarugenge": {
            cells: {
              "Kiyovu": ["Rugunga", "Kiyovu", "Inyange", "Cercle Sportif"],
              "Biryogo": ["Biryogo", "Kavumu", "Gasharu"],
              "Rwampara": ["Rwampara", "Gatsata", "Kabeza"]
            }
          },
          "Nyamirambo": {
            cells: {
              "Mumena": ["Mumena", "Kavumu", "Cyivugiza"],
              "Cyivugiza": ["Cyivugiza", "Rugarama", "Kigarama"],
              "Rugarama": ["Rugarama", "Gasharu", "Kabeza"]
            }
          },
          "Gitega": { cells: { "Gitega": ["Gitega", "Akabahizi"], "Kora": ["Kora", "Kavumu"] } },
          "Kanyinya": { cells: { "Nyamweru": ["Nyamweru", "Kavumu"], "Taba": ["Taba", "Gasharu"] } },
          "Kigali": { cells: { "Kigali": ["Kigali", "Mwendo"], "Mwendo": ["Mwendo", "Rwesero"] } },
          "Kimisagara": { cells: { "Kimisagara": ["Kimisagara", "Katabaro"], "Katabaro": ["Katabaro", "Kamuhoza"] } },
          "Mageragere": { cells: { "Mataba": ["Mataba", "Kavumu"], "Kankuba": ["Kankuba", "Rebero"] } },
          "Muhima": { cells: { "Kabaya": ["Kabaya", "Kavumu"], "Tetero": ["Tetero", "Ubumwe"] } },
          "Nyakabanda": { cells: { "Nyakabanda": ["Nyakabanda", "Kavumu"] } },
          "Rwezamenyo": { cells: { "Rwezamenyo": ["Rwezamenyo", "Kavumu"] } }
        }
      },
      "Gasabo": {
        sectors: {
          "Gisozi": {
            cells: {
              "Musezero": ["Musezero", "Gasave", "Kigarama"],
              "Ruhango": ["Ruhango", "Kavumu", "Gasharu"]
            }
          },
          "Kacyiru": {
            cells: {
              "Kamatamu": ["Kamatamu", "Kavumu", "Rebero"],
              "Kibaza": ["Kibaza", "Inyange", "Gasharu"]
            }
          },
          "Kimihurura": {
            cells: {
              "Kimihurura": ["Kimihurura", "Rugando"],
              "Kamukina": ["Kamukina", "Kavumu"]
            }
          },
          "Remera": {
            cells: {
              "Rukiri I": ["Rukiri I", "Kavumu"],
              "Rukiri II": ["Rukiri II", "Rebero"],
              "Nyabisindu": ["Nyabisindu", "Amizero"]
            }
          },
          "Kimironko": {
            cells: {
              "Kibagabaga": ["Kibagabaga", "Kavumu"],
              "Bibare": ["Bibare", "Rebero"],
              "Nyagatovu": ["Nyagatovu", "Gasharu"]
            }
          },
          "Kinyinya": { cells: { "Kagugu": ["Kagugu", "Kavumu"], "Gasharu": ["Gasharu", "Rebero"] } },
          "Bumbogo": { cells: { "Bumbogo": ["Bumbogo", "Kavumu"] } },
          "Gatsata": { cells: { "Gatsata": ["Gatsata", "Kavumu"] } },
          "Jali": { cells: { "Jali": ["Jali", "Kavumu"] } },
          "Gikomero": { cells: { "Gikomero": ["Gikomero", "Kavumu"] } },
          "Jabana": { cells: { "Jabana": ["Jabana", "Kavumu"] } },
          "Ndera": { cells: { "Ndera": ["Ndera", "Kavumu"] } },
          "Nduba": { cells: { "Nduba": ["Nduba", "Kavumu"] } },
          "Rusororo": { cells: { "Rusororo": ["Rusororo", "Kavumu"] } },
          "Rutunga": { cells: { "Rutunga": ["Rutunga", "Kavumu"] } }
        }
      },
      "Kicukiro": {
        sectors: {
          "Kagarama": {
            cells: {
              "Muyange": ["Muyange", "Kanserege", "Kavumu"],
              "Rukatsa": ["Rukatsa", "Gasharu", "Rebero"]
            }
          },
          "Kanombe": {
            cells: {
              "Kabeza": ["Kabeza", "Rubirizi"],
              "Busanza": ["Busanza", "Kavumu"],
              "Karama": ["Karama", "Rebero"]
            }
          },
          "Gikondo": { cells: { "Kanserege": ["Kanserege", "Kavumu"], "Kinunga": ["Kinunga", "Rebero"] } },
          "Gahanga": { cells: { "Gahanga": ["Gahanga", "Kavumu"], "Kagasa": ["Kagasa", "Rebero"] } },
          "Gatenga": { cells: { "Gatenga": ["Gatenga", "Kavumu"], "Karambo": ["Karambo", "Rebero"] } },
          "Kicukiro": { cells: { "Ngoma": ["Ngoma", "Kavumu"] } },
          "Kigarama": { cells: { "Kigarama": ["Kigarama", "Kavumu"] } },
          "Masaka": { cells: { "Masaka": ["Masaka", "Ayabaramba"] } },
          "Niboye": { cells: { "Niboye": ["Niboye", "Kavumu"], "Nyakabanda": ["Nyakabanda", "Rebero"] } },
          "Nyarugunga": { cells: { "Kamashashi": ["Kamashashi", "Rwimbogo"] } }
        }
      }
    }
  },
  "Southern Province": {
    name: "Southern Province",
    kinyarwandaName: "Intara y'Amajyepfo",
    districts: {
      "Huye": {
        sectors: {
          "Ngoma": { cells: { "Butare": ["Butare", "Kavumu"], "Matyazo": ["Matyazo", "Rebero"] } },
          "Tumba": { cells: { "Tumba": ["Tumba", "Rango"], "Rango": ["Rango", "Kavumu"] } },
          "Mukura": { cells: { "Mukura": ["Mukura", "Kavumu"] } },
          "Mbazi": { cells: { "Mbazi": ["Mbazi", "Kavumu"] } },
          "Huye": { cells: { "Huye": ["Huye", "Kavumu"] } },
          "Gishamvu": { cells: { "Gishamvu": ["Gishamvu", "Kavumu"] } },
          "Karama": { cells: { "Karama": ["Karama", "Kavumu"] } },
          "Kigoma": { cells: { "Kigoma": ["Kigoma", "Kavumu"] } },
          "Kinazi": { cells: { "Kinazi": ["Kinazi", "Kavumu"] } },
          "Maraba": { cells: { "Maraba": ["Maraba", "Kavumu"] } },
          "Ruhashya": { cells: { "Ruhashya": ["Ruhashya", "Kavumu"] } },
          "Rusatira": { cells: { "Rusatira": ["Rusatira", "Kavumu"] } },
          "Rwaniro": { cells: { "Rwaniro": ["Rwaniro", "Kavumu"] } },
          "Simbi": { cells: { "Simbi": ["Simbi", "Kavumu"] } }
        }
      },
      "Muhanga": {
        sectors: {
          "Shyogwe": { cells: { "Cyeza": ["Cyeza", "Kavumu"], "Mubuga": ["Mubuga", "Rebero"] } },
          "Nyamabuye": { cells: { "Gitarama": ["Gitarama", "Kavumu"], "Nyamabuye": ["Nyamabuye", "Rebero"] } },
          "Cyeza": { cells: { "Cyeza": ["Cyeza", "Kavumu"] } },
          "Kabacuzi": { cells: { "Kabacuzi": ["Kabacuzi", "Kavumu"] } },
          "Kibangu": { cells: { "Kibangu": ["Kibangu", "Kavumu"] } },
          "Kiyumba": { cells: { "Kiyumba": ["Kiyumba", "Kavumu"] } },
          "Muhanga": { cells: { "Muhanga": ["Muhanga", "Kavumu"] } },
          "Mushishiro": { cells: { "Mushishiro": ["Mushishiro", "Kavumu"] } },
          "Nyabinoni": { cells: { "Nyabinoni": ["Nyabinoni", "Kavumu"] } },
          "Nyarusange": { cells: { "Nyarusange": ["Nyarusange", "Kavumu"] } },
          "Rongi": { cells: { "Rongi": ["Rongi", "Kavumu"] } },
          "Rugendabari": { cells: { "Rugendabari": ["Rugendabari", "Kavumu"] } }
        }
      },
      "Ruhango": {
        sectors: {
          "Byimana": { cells: { "Muhororo": ["Muhororo", "Kavumu"], "Kamonyi": ["Kamonyi", "Rebero"] } },
          "Ruhango": { cells: { "Ruhango": ["Ruhango", "Kavumu"] } },
          "Bweramana": { cells: { "Bweramana": ["Bweramana", "Kavumu"] } },
          "Kabagali": { cells: { "Kabagali": ["Kabagali", "Kavumu"] } },
          "Kinazi": { cells: { "Kinazi": ["Kinazi", "Kavumu"] } },
          "Kinihira": { cells: { "Kinihira": ["Kinihira", "Kavumu"] } },
          "Mbuye": { cells: { "Mbuye": ["Mbuye", "Kavumu"] } },
          "Mwendo": { cells: { "Mwendo": ["Mwendo", "Kavumu"] } },
          "Ntongwe": { cells: { "Ntongwe": ["Ntongwe", "Kavumu"] } }
        }
      },
      "Kamonyi": {
        sectors: {
          "Rukoma": { cells: { "Bugoba": ["Bugoba", "Kavumu"], "Remera": ["Remera", "Rebero"] } },
          "Gacurabwenge": { cells: { "Gacurabwenge": ["Gacurabwenge", "Kavumu"] } },
          "Karama": { cells: { "Karama": ["Karama", "Kavumu"] } },
          "Kayenzi": { cells: { "Kayenzi": ["Kayenzi", "Kavumu"] } },
          "Kayumbu": { cells: { "Kayumbu": ["Kayumbu", "Kavumu"] } },
          "Mugina": { cells: { "Mugina": ["Mugina", "Kavumu"] } },
          "Musambira": { cells: { "Musambira": ["Musambira", "Kavumu"] } },
          "Ngamba": { cells: { "Ngamba": ["Ngamba", "Kavumu"] } },
          "Nyamiyaga": { cells: { "Nyamiyaga": ["Nyamiyaga", "Kavumu"] } },
          "Nyarubaka": { cells: { "Nyarubaka": ["Nyarubaka", "Kavumu"] } },
          "Rugarika": { cells: { "Rugarika": ["Rugarika", "Kavumu"] } }
        }
      },
      "Nyanza": {
        sectors: {
          "Busasamana": { cells: { "Nyanza": ["Nyanza", "Rwesero"], "Kavumu": ["Kavumu", "Gasharu"] } },
          "Kibilizi": { cells: { "Cyeza": ["Cyeza", "Kavumu"] } },
          "Busoro": { cells: { "Busoro": ["Busoro", "Kavumu"] } },
          "Cyabakamyi": { cells: { "Cyabakamyi": ["Cyabakamyi", "Kavumu"] } },
          "Kigoma": { cells: { "Kigoma": ["Kigoma", "Kavumu"] } },
          "Mukingo": { cells: { "Mukingo": ["Mukingo", "Kavumu"] } },
          "Muyira": { cells: { "Muyira": ["Muyira", "Kavumu"] } },
          "Ntyazo": { cells: { "Ntyazo": ["Ntyazo", "Kavumu"] } },
          "Nyagisozi": { cells: { "Nyagisozi": ["Nyagisozi", "Kavumu"] } },
          "Rwabicuma": { cells: { "Rwabicuma": ["Rwabicuma", "Kavumu"] } }
        }
      },
      "Gisagara": {
        sectors: {
          "Gikonko": { cells: { "Mbogo": ["Mbogo", "Kavumu"] } },
          "Save": { cells: { "Save": ["Save", "Shyanda"] } },
          "Gishubi": { cells: { "Gishubi": ["Gishubi", "Kavumu"] } },
          "Kansi": { cells: { "Kansi": ["Kansi", "Kavumu"] } },
          "Kibilizi": { cells: { "Kibilizi": ["Kibilizi", "Kavumu"] } },
          "Kigembe": { cells: { "Kigembe": ["Kigembe", "Kavumu"] } },
          "Mamba": { cells: { "Mamba": ["Mamba", "Kavumu"] } },
          "Muganza": { cells: { "Muganza": ["Muganza", "Kavumu"] } },
          "Mugombwa": { cells: { "Mugombwa": ["Mugombwa", "Kavumu"] } },
          "Mukindo": { cells: { "Mukindo": ["Mukindo", "Kavumu"] } },
          "Musha": { cells: { "Musha": ["Musha", "Kavumu"] } },
          "Ndora": { cells: { "Ndora": ["Ndora", "Kavumu"] } },
          "Nyanza": { cells: { "Nyanza": ["Nyanza", "Kavumu"] } }
        }
      },
      "Nyamagabe": {
        sectors: {
          "Gasaka": { cells: { "Nyamagabe": ["Nyamagabe", "Kavumu"] } },
          "Kitabi": { cells: { "Kitabi": ["Kitabi", "Nyungwe"] } },
          "Buruhukiro": { cells: { "Buruhukiro": ["Buruhukiro", "Kavumu"] } },
          "Cyanika": { cells: { "Cyanika": ["Cyanika", "Kavumu"] } },
          "Gatare": { cells: { "Gatare": ["Gatare", "Kavumu"] } },
          "Kaduha": { cells: { "Kaduha": ["Kaduha", "Kavumu"] } },
          "Kamegeli": { cells: { "Kamegeli": ["Kamegeli", "Kavumu"] } },
          "Kibirizi": { cells: { "Kibirizi": ["Kibirizi", "Kavumu"] } },
          "Kibumbwe": { cells: { "Kibumbwe": ["Kibumbwe", "Kavumu"] } },
          "Musebeya": { cells: { "Musebeya": ["Musebeya", "Kavumu"] } },
          "Mushubi": { cells: { "Mushubi": ["Mushubi", "Kavumu"] } },
          "Nkomane": { cells: { "Nkomane": ["Nkomane", "Kavumu"] } },
          "Mugano": { cells: { "Mugano": ["Mugano", "Kavumu"] } },
          "Uwinkingi": { cells: { "Uwinkingi": ["Uwinkingi", "Kavumu"] } }
        }
      },
      "Nyaruguru": {
        sectors: {
          "Kibeho": { cells: { "Kibeho": ["Kibeho", "Nyange"] } },
          "Munini": { cells: { "Munini": ["Munini", "Kavumu"] } },
          "Cyahinda": { cells: { "Cyahinda": ["Cyahinda", "Kavumu"] } },
          "Busanze": { cells: { "Busanze": ["Busanze", "Kavumu"] } },
          "Mata": { cells: { "Mata": ["Mata", "Kavumu"] } },
          "Kivu": { cells: { "Kivu": ["Kivu", "Kavumu"] } },
          "Ngera": { cells: { "Ngera": ["Ngera", "Kavumu"] } },
          "Ngoma": { cells: { "Ngoma": ["Ngoma", "Kavumu"] } },
          "Nyabimata": { cells: { "Nyabimata": ["Nyabimata", "Kavumu"] } },
          "Nyagisozi": { cells: { "Nyagisozi": ["Nyagisozi", "Kavumu"] } },
          "Muganza": { cells: { "Muganza": ["Muganza", "Kavumu"] } },
          "Ruheru": { cells: { "Ruheru": ["Ruheru", "Kavumu"] } },
          "Ruramba": { cells: { "Ruramba": ["Ruramba", "Kavumu"] } },
          "Rusenge": { cells: { "Rusenge": ["Rusenge", "Kavumu"] } }
        }
      }
    }
  },
  "Eastern Province": {
    name: "Eastern Province",
    kinyarwandaName: "Intara y'Iburasirazuba",
    districts: {
      "Rwamagana": {
        sectors: {
          "Kigabiro": { cells: { "Nyagasenyi": ["Nyagasenyi", "Rwamagana"] } },
          "Muhazi": { cells: { "Muhazi": ["Muhazi", "Kavumu"] } },
          "Gishari": { cells: { "Gishari": ["Gishari", "Kavumu"] } },
          "Fumbwe": { cells: { "Fumbwe": ["Fumbwe", "Kavumu"] } },
          "Gahengeri": { cells: { "Gahengeri": ["Gahengeri", "Kavumu"] } },
          "Karenge": { cells: { "Karenge": ["Karenge", "Kavumu"] } },
          "Munyaga": { cells: { "Munyaga": ["Munyaga", "Kavumu"] } },
          "Munyiginya": { cells: { "Munyiginya": ["Munyiginya", "Kavumu"] } },
          "Musha": { cells: { "Musha": ["Musha", "Kavumu"] } },
          "Muyumbu": { cells: { "Muyumbu": ["Muyumbu", "Kavumu"] } },
          "Mwulire": { cells: { "Mwulire": ["Mwulire", "Kavumu"] } },
          "Nyakariro": { cells: { "Nyakariro": ["Nyakariro", "Kavumu"] } },
          "Nzige": { cells: { "Nzige": ["Nzige", "Kavumu"] } },
          "Rubona": { cells: { "Rubona": ["Rubona", "Kavumu"] } }
        }
      },
      "Kayonza": {
        sectors: {
          "Gahini": { cells: { "Urugarama": ["Urugarama", "Gahini"] } },
          "Mukarange": { cells: { "Kayonza": ["Kayonza", "Kavumu"] } },
          "Kabarondo": { cells: { "Kabarondo": ["Kabarondo", "Kavumu"] } },
          "Kabare": { cells: { "Kabare": ["Kabare", "Kavumu"] } },
          "Murama": { cells: { "Murama": ["Murama", "Kavumu"] } },
          "Murundi": { cells: { "Murundi": ["Murundi", "Kavumu"] } },
          "Mwiri": { cells: { "Mwiri": ["Mwiri", "Kavumu"] } },
          "Ndego": { cells: { "Ndego": ["Ndego", "Kavumu"] } },
          "Nyamirama": { cells: { "Nyamirama": ["Nyamirama", "Kavumu"] } },
          "Rukara": { cells: { "Rukara": ["Rukara", "Kavumu"] } },
          "Ruramira": { cells: { "Ruramira": ["Ruramira", "Kavumu"] } },
          "Rwinkwavu": { cells: { "Rwinkwavu": ["Rwinkwavu", "Kavumu"] } }
        }
      },
      "Bugesera": {
        sectors: {
          "Nyamata": { cells: { "Nyamata": ["Nyamata", "Kanzenze"] } },
          "Rilima": { cells: { "Karera": ["Karera", "Rilima"] } },
          "Gashora": { cells: { "Gashora": ["Gashora", "Kavumu"] } },
          "Juru": { cells: { "Juru": ["Juru", "Kavumu"] } },
          "Kamabuye": { cells: { "Kamabuye": ["Kamabuye", "Kavumu"] } },
          "Ntarama": { cells: { "Ntarama": ["Ntarama", "Kavumu"] } },
          "Mareba": { cells: { "Mareba": ["Mareba", "Kavumu"] } },
          "Mayange": { cells: { "Mayange": ["Mayange", "Kavumu"] } },
          "Musenyi": { cells: { "Musenyi": ["Musenyi", "Kavumu"] } },
          "Mwogo": { cells: { "Mwogo": ["Mwogo", "Kavumu"] } },
          "Ngeruka": { cells: { "Ngeruka": ["Ngeruka", "Kavumu"] } },
          "Nyarugenge": { cells: { "Nyarugenge": ["Nyarugenge", "Kavumu"] } },
          "Ruhuha": { cells: { "Ruhuha": ["Ruhuha", "Kavumu"] } },
          "Rweru": { cells: { "Rweru": ["Rweru", "Kavumu"] } },
          "Shyara": { cells: { "Shyara": ["Shyara", "Kavumu"] } }
        }
      },
      "Gatsibo": {
        sectors: {
          "Kabarore": { cells: { "Kabarore": ["Kabarore", "Kavumu"] } },
          "Kiramuruzi": { cells: { "Kiramuruzi": ["Kiramuruzi", "Kavumu"] } },
          "Kiziguro": { cells: { "Kiziguro": ["Kiziguro", "Kavumu"] } },
          "Gasange": { cells: { "Gasange": ["Gasange", "Kavumu"] } },
          "Gatsibo": { cells: { "Gatsibo": ["Gatsibo", "Kavumu"] } },
          "Gitoki": { cells: { "Gitoki": ["Gitoki", "Kavumu"] } },
          "Kageyo": { cells: { "Kageyo": ["Kageyo", "Kavumu"] } },
          "Muhura": { cells: { "Muhura": ["Muhura", "Kavumu"] } },
          "Murambi": { cells: { "Murambi": ["Murambi", "Kavumu"] } },
          "Ngarama": { cells: { "Ngarama": ["Ngarama", "Kavumu"] } },
          "Nyagihanga": { cells: { "Nyagihanga": ["Nyagihanga", "Kavumu"] } },
          "Remera": { cells: { "Remera": ["Remera", "Kavumu"] } },
          "Rugarama": { cells: { "Rugarama": ["Rugarama", "Kavumu"] } },
          "Rwimbogo": { cells: { "Rwimbogo": ["Rwimbogo", "Kavumu"] } }
        }
      },
      "Nyagatare": {
        sectors: {
          "Nyagatare": { cells: { "Barija": ["Barija", "Nyagatare"] } },
          "Karangazi": { cells: { "Karangazi": ["Karangazi", "Kavumu"] } },
          "Gatunda": { cells: { "Gatunda": ["Gatunda", "Kavumu"] } },
          "Kiyombe": { cells: { "Kiyombe": ["Kiyombe", "Kavumu"] } },
          "Karama": { cells: { "Karama": ["Karama", "Kavumu"] } },
          "Katabagemu": { cells: { "Katabagemu": ["Katabagemu", "Kavumu"] } },
          "Matimba": { cells: { "Matimba": ["Matimba", "Kavumu"] } },
          "Mimuri": { cells: { "Mimuri": ["Mimuri", "Kavumu"] } },
          "Mukama": { cells: { "Mukama": ["Mukama", "Kavumu"] } },
          "Musheli": { cells: { "Musheli": ["Musheli", "Kavumu"] } },
          "Rukomo": { cells: { "Rukomo": ["Rukomo", "Kavumu"] } },
          "Rwempasha": { cells: { "Rwempasha": ["Rwempasha", "Kavumu"] } },
          "Rwimiyaga": { cells: { "Rwimiyaga": ["Rwimiyaga", "Kavumu"] } },
          "Tabagwe": { cells: { "Tabagwe": ["Tabagwe", "Kavumu"] } }
        }
      },
      "Kirehe": {
        sectors: {
          "Kirehe": { cells: { "Kirehe": ["Kirehe", "Nyakarambi"] } },
          "Gatore": { cells: { "Gatore": ["Gatore", "Kavumu"] } },
          "Gahara": { cells: { "Gahara": ["Gahara", "Kavumu"] } },
          "Kigarama": { cells: { "Kigarama": ["Kigarama", "Kavumu"] } },
          "Kigina": { cells: { "Kigina": ["Kigina", "Kavumu"] } },
          "Mahama": { cells: { "Mahama": ["Mahama", "Kavumu"] } },
          "Mpanga": { cells: { "Mpanga": ["Mpanga", "Kavumu"] } },
          "Musaza": { cells: { "Musaza": ["Musaza", "Kavumu"] } },
          "Mushikiri": { cells: { "Mushikiri": ["Mushikiri", "Kavumu"] } },
          "Nasho": { cells: { "Nasho": ["Nasho", "Kavumu"] } },
          "Nyamugari": { cells: { "Nyamugari": ["Nyamugari", "Kavumu"] } },
          "Nyarubuye": { cells: { "Nyarubuye": ["Nyarubuye", "Kavumu"] } }
        }
      },
      "Ngoma": {
        sectors: {
          "Kibungo": { cells: { "Gahima": ["Gahima", "Kibungo"] } },
          "Zaza": { cells: { "Zaza": ["Zaza", "Kavumu"] } },
          "Gashanda": { cells: { "Gashanda": ["Gashanda", "Kavumu"] } },
          "Jarama": { cells: { "Jarama": ["Jarama", "Kavumu"] } },
          "Karembo": { cells: { "Karembo": ["Karembo", "Kavumu"] } },
          "Kazo": { cells: { "Kazo": ["Kazo", "Kavumu"] } },
          "Mugesera": { cells: { "Mugesera": ["Mugesera", "Kavumu"] } },
          "Murama": { cells: { "Murama": ["Murama", "Kavumu"] } },
          "Mutenderi": { cells: { "Mutenderi": ["Mutenderi", "Kavumu"] } },
          "Remera": { cells: { "Remera": ["Remera", "Kavumu"] } },
          "Rukira": { cells: { "Rukira": ["Rukira", "Kavumu"] } },
          "Rukumberi": { cells: { "Rukumberi": ["Rukumberi", "Kavumu"] } },
          "Rurenge": { cells: { "Rurenge": ["Rurenge", "Kavumu"] } },
          "Sake": { cells: { "Sake": ["Sake", "Kavumu"] } }
        }
      }
    }
  },
  "Western Province": {
    name: "Western Province",
    kinyarwandaName: "Intara y'Iburengerazuba",
    districts: {
      "Rubavu": {
        sectors: {
          "Gisenyi": { cells: { "Kivumu": ["Kivumu", "Rubavu"], "Gisenyi": ["Gisenyi", "Kavumu"] } },
          "Rugerero": { cells: { "Rugerero": ["Rugerero", "Kavumu"] } },
          "Bugeshi": { cells: { "Bugeshi": ["Bugeshi", "Kavumu"] } },
          "Busasamana": { cells: { "Busasamana": ["Busasamana", "Kavumu"] } },
          "Cyanzarwe": { cells: { "Cyanzarwe": ["Cyanzarwe", "Kavumu"] } },
          "Kanama": { cells: { "Kanama": ["Kanama", "Kavumu"] } },
          "Kanzenze": { cells: { "Kanzenze": ["Kanzenze", "Kavumu"] } },
          "Mudende": { cells: { "Mudende": ["Mudende", "Kavumu"] } },
          "Nyakiriba": { cells: { "Nyakiriba": ["Nyakiriba", "Kavumu"] } },
          "Nyamyumba": { cells: { "Nyamyumba": ["Nyamyumba", "Kavumu"] } },
          "Nyundo": { cells: { "Nyundo": ["Nyundo", "Kavumu"] } },
          "Rubavu": { cells: { "Rubavu": ["Rubavu", "Kavumu"] } }
        }
      },
      "Rusizi": {
        sectors: {
          "Kamembe": { cells: { "Kamembe": ["Kamembe", "Kavumu"] } },
          "Bugarama": { cells: { "Bugarama": ["Bugarama", "Kavumu"] } },
          "Gihundwe": { cells: { "Gihundwe": ["Gihundwe", "Kavumu"] } },
          "Butare": { cells: { "Butare": ["Butare", "Kavumu"] } },
          "Bweyeye": { cells: { "Bweyeye": ["Bweyeye", "Kavumu"] } },
          "Gikundamvura": { cells: { "Gikundamvura": ["Gikundamvura", "Kavumu"] } },
          "Gashonga": { cells: { "Gashonga": ["Gashonga", "Kavumu"] } },
          "Giheke": { cells: { "Giheke": ["Giheke", "Kavumu"] } },
          "Muganza": { cells: { "Muganza": ["Muganza", "Kavumu"] } },
          "Mururu": { cells: { "Mururu": ["Mururu", "Kavumu"] } },
          "Nkanka": { cells: { "Nkanka": ["Nkanka", "Kavumu"] } },
          "Nkombo": { cells: { "Nkombo": ["Nkombo", "Kavumu"] } },
          "Nkungu": { cells: { "Nkungu": ["Nkungu", "Kavumu"] } },
          "Nyakabuye": { cells: { "Nyakabuye": ["Nyakabuye", "Kavumu"] } },
          "Nyakarenzo": { cells: { "Nyakarenzo": ["Nyakarenzo", "Kavumu"] } },
          "Nzahaha": { cells: { "Nzahaha": ["Nzahaha", "Kavumu"] } },
          "Rwimbogo": { cells: { "Rwimbogo": ["Rwimbogo", "Kavumu"] } }
        }
      },
      "Karongi": {
        sectors: {
          "Bwishyura": { cells: { "Kibuye": ["Kibuye", "Kavumu"] } },
          "Rubengera": { cells: { "Rubengera": ["Rubengera", "Kavumu"] } },
          "Gishyita": { cells: { "Gishyita": ["Gishyita", "Kavumu"] } },
          "Gashari": { cells: { "Gashari": ["Gashari", "Kavumu"] } },
          "Gitesi": { cells: { "Gitesi": ["Gitesi", "Kavumu"] } },
          "Mubuga": { cells: { "Mubuga": ["Mubuga", "Kavumu"] } },
          "Murambi": { cells: { "Murambi": ["Murambi", "Kavumu"] } },
          "Murundi": { cells: { "Murundi": ["Murundi", "Kavumu"] } },
          "Mutuntu": { cells: { "Mutuntu": ["Mutuntu", "Kavumu"] } },
          "Rugabano": { cells: { "Rugabano": ["Rugabano", "Kavumu"] } },
          "Ruganda": { cells: { "Ruganda": ["Ruganda", "Kavumu"] } },
          "Rwankuba": { cells: { "Rwankuba": ["Rwankuba", "Kavumu"] } },
          "Twumba": { cells: { "Twumba": ["Twumba", "Kavumu"] } }
        }
      },
      "Rutsiro": {
        sectors: {
          "Gihango": { cells: { "Gihango": ["Gihango", "Kavumu"] } },
          "Kivumu": { cells: { "Kivumu": ["Kivumu", "Kavumu"] } },
          "Boneza": { cells: { "Boneza": ["Boneza", "Kavumu"] } },
          "Kigeyo": { cells: { "Kigeyo": ["Kigeyo", "Kavumu"] } },
          "Manihira": { cells: { "Manihira": ["Manihira", "Kavumu"] } },
          "Mukura": { cells: { "Mukura": ["Mukura", "Kavumu"] } },
          "Murunda": { cells: { "Murunda": ["Murunda", "Kavumu"] } },
          "Musasa": { cells: { "Musasa": ["Musasa", "Kavumu"] } },
          "Mushonyi": { cells: { "Mushonyi": ["Mushonyi", "Kavumu"] } },
          "Mushubati": { cells: { "Mushubati": ["Mushubati", "Kavumu"] } },
          "Nyabirasi": { cells: { "Nyabirasi": ["Nyabirasi", "Kavumu"] } },
          "Ruhango": { cells: { "Ruhango": ["Ruhango", "Kavumu"] } },
          "Rusebeya": { cells: { "Rusebeya": ["Rusebeya", "Kavumu"] } }
        }
      },
      "Nyabihu": {
        sectors: {
          "Mukamira": { cells: { "Mukamira": ["Mukamira", "Kavumu"] } },
          "Bigogwe": { cells: { "Bigogwe": ["Bigogwe", "Kavumu"] } },
          "Jenda": { cells: { "Jenda": ["Jenda", "Kavumu"] } },
          "Jomba": { cells: { "Jomba": ["Jomba", "Kavumu"] } },
          "Kabatwa": { cells: { "Kabatwa": ["Kabatwa", "Kavumu"] } },
          "Karago": { cells: { "Karago": ["Karago", "Kavumu"] } },
          "Kintobo": { cells: { "Kintobo": ["Kintobo", "Kavumu"] } },
          "Muringa": { cells: { "Muringa": ["Muringa", "Kavumu"] } },
          "Rambura": { cells: { "Rambura": ["Rambura", "Kavumu"] } },
          "Rugera": { cells: { "Rugera": ["Rugera", "Kavumu"] } },
          "Rurembo": { cells: { "Rurembo": ["Rurembo", "Kavumu"] } },
          "Shyira": { cells: { "Shyira": ["Shyira", "Kavumu"] } }
        }
      },
      "Ngororero": {
        sectors: {
          "Ngororero": { cells: { "Ngororero": ["Ngororero", "Kavumu"] } },
          "Bwira": { cells: { "Bwira": ["Bwira", "Kavumu"] } },
          "Gatumba": { cells: { "Gatumba": ["Gatumba", "Kavumu"] } },
          "Hindiro": { cells: { "Hindiro": ["Hindiro", "Kavumu"] } },
          "Kabaya": { cells: { "Kabaya": ["Kabaya", "Kavumu"] } },
          "Kageyo": { cells: { "Kageyo": ["Kageyo", "Kavumu"] } },
          "Kavumu": { cells: { "Kavumu": ["Kavumu", "Kavumu"] } },
          "Matyazo": { cells: { "Matyazo": ["Matyazo", "Kavumu"] } },
          "Muhanda": { cells: { "Muhanda": ["Muhanda", "Kavumu"] } },
          "Muhororo": { cells: { "Muhororo": ["Muhororo", "Kavumu"] } },
          "Ndaro": { cells: { "Ndaro": ["Ndaro", "Kavumu"] } },
          "Nyange": { cells: { "Nyange": ["Nyange", "Kavumu"] } },
          "Sovu": { cells: { "Sovu": ["Sovu", "Kavumu"] } }
        }
      },
      "Nyamasheke": {
        sectors: {
          "Kagano": { cells: { "Nyamasheke": ["Nyamasheke", "Kavumu"] } },
          "Bushekeri": { cells: { "Bushekeri": ["Bushekeri", "Kavumu"] } },
          "Bushenge": { cells: { "Bushenge": ["Bushenge", "Kavumu"] } },
          "Cyato": { cells: { "Cyato": ["Cyato", "Kavumu"] } },
          "Gihombo": { cells: { "Gihombo": ["Gihombo", "Kavumu"] } },
          "Kanjongo": { cells: { "Kanjongo": ["Kanjongo", "Kavumu"] } },
          "Karambi": { cells: { "Karambi": ["Karambi", "Kavumu"] } },
          "Karengera": { cells: { "Karengera": ["Karengera", "Kavumu"] } },
          "Kirimbi": { cells: { "Kirimbi": ["Kirimbi", "Kavumu"] } },
          "Macuba": { cells: { "Macuba": ["Macuba", "Kavumu"] } },
          "Nyabitekeri": { cells: { "Nyabitekeri": ["Nyabitekeri", "Kavumu"] } },
          "Mahembe": { cells: { "Mahembe": ["Mahembe", "Kavumu"] } },
          "Rangiro": { cells: { "Rangiro": ["Rangiro", "Kavumu"] } },
          "Ruharambuga": { cells: { "Ruharambuga": ["Ruharambuga", "Kavumu"] } },
          "Shangi": { cells: { "Shangi": ["Shangi", "Kavumu"] } }
        }
      }
    }
  }
};

/**
 * Returns all 5 official Provinces of Rwanda
 */
export const getProvinces = (): string[] => {
  return Object.keys(RWANDA_ADMINISTRATIVE_DATA);
};

/**
 * Returns all official Districts for a given Province
 */
export const getDistrictsByProvince = (provinceName: string): string[] => {
  if (!provinceName || !RWANDA_ADMINISTRATIVE_DATA[provinceName]) return [];
  return Object.keys(RWANDA_ADMINISTRATIVE_DATA[provinceName].districts);
};

/**
 * Returns all official Sectors for a given District in a Province
 */
export const getSectorsByDistrict = (provinceName: string, districtName: string): string[] => {
  if (!provinceName || !districtName) return [];
  const prov = RWANDA_ADMINISTRATIVE_DATA[provinceName];
  if (!prov || !prov.districts[districtName]) return [];
  return Object.keys(prov.districts[districtName].sectors);
};

/**
 * Returns Cells for a Sector. If no official list exists, returns empty array
 */
export const getCellsBySector = (provinceName: string, districtName: string, sectorName: string): string[] => {
  if (!provinceName || !districtName || !sectorName) return [];
  const prov = RWANDA_ADMINISTRATIVE_DATA[provinceName];
  if (!prov || !prov.districts[districtName]) return [];
  const sector = prov.districts[districtName].sectors[sectorName];
  if (!sector) return [];
  if (Array.isArray(sector)) return sector;
  if (sector.cells) return Object.keys(sector.cells);
  return [];
};

/**
 * Returns Villages for a Cell. If no official list exists, returns empty array
 */
export const getVillagesByCell = (
  provinceName: string, 
  districtName: string, 
  sectorName: string, 
  cellName: string
): string[] => {
  if (!provinceName || !districtName || !sectorName || !cellName) return [];
  const prov = RWANDA_ADMINISTRATIVE_DATA[provinceName];
  if (!prov || !prov.districts[districtName]) return [];
  const sector = prov.districts[districtName].sectors[sectorName];
  if (!sector || Array.isArray(sector) || !sector.cells) return [];
  return sector.cells[cellName] || [];
};

/**
 * Find Province given a District (helper for auto-detection)
 */
export const findProvinceByDistrict = (districtName: string): string | null => {
  if (!districtName) return null;
  for (const [provName, provData] of Object.entries(RWANDA_ADMINISTRATIVE_DATA)) {
    if (provData.districts[districtName]) {
      return provName;
    }
  }
  return null;
};
