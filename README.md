## Sistemos paskirtis
Projekto tikslas – sukurti asmeninių finansų valdymo programėlę, kurioje naudotojas galėtų sekti savo pajamas ir išlaidas skirtingose sąskaitose, planuoti mėnesio biudžetus, matyti mėnesio išlaidų apžvalgą ir gauti dirbtinio intelekto sugeneruotus patarimus, kaip geriau tvarkyti savo finansus.

Veikimo principas – projektą sudarys trys dalys:
-	Mobilioji ir internetinė aplikacija, kurią naudos svečiai, naudotojai ir administratoriai;
-	Serverinė dalis, kurioje bus visos aplikacijos programavimo sąsajos (API);
-	Duomenų bazė, kurioje bus saugoma visa naudotojų, sąskaitų, operacijų ir pastabų informacija.

## Funkciniai reikalavimai
__Svečias__ galės:
-	Prisiregistruoti prie sistemos (patvirtinant el. paštą vienkartiniu kodu);
-	Prisijungti prie sistemos;
-	Atkurti pamirštą slaptažodį;
-	Peržiūrėti valiutų kursus;
-	Peržiūrėti operacijų kategorijų sąrašą.

__Registruotas sistemos naudotojas__ galės:
-	Atlikti visus veiksmus kaip ir svečias;
-	Atsijungti nuo sistemos;
-	Valdyti sąskaitas:
    -	Sukurti sąskaitą;
    -	Redaguoti sąskaitą;
    -	Peržiūrėti sąskaitą ir jos likutį;
    -	Pašalinti sąskaitą;
    -	Peržiūrėti visų sąskaitų sąrašą.
-	Valdyti operacijas:
    -	Sukurti operaciją (pajamas arba išlaidas);
    -	Redaguoti operaciją;
    -	Peržiūrėti operaciją;
    -	Pašalinti operaciją;
    -	Peržiūrėti visų operacijų sąrašą;
    -	Peržiūrėti visų konkrečios sąskaitos operacijų sąrašą.
-	Valdyti pastabas:
    -	Sukurti pastabą operacijai;
    -	Redaguoti pastabą;
    -	Peržiūrėti pastabą;
    -	Pašalinti pastabą;
    -	Peržiūrėti visų konkrečios operacijos pastabų sąrašą.
-	Valdyti mėnesio biudžetus pagal išlaidų kategorijas;
-	Peržiūrėti mėnesio pajamų ir išlaidų apžvalgą pagal kategorijas;
-	Gauti dirbtinio intelekto sugeneruotas mėnesio išlaidų įžvalgas;
-	Valdyti savo profilį: pakeisti nuotrauką, rodomą valiutą, slaptažodį arba ištrinti paskyrą.

__Sistemos administratorius__ galės:
-	Atlikti visus veiksmus kaip ir prisijungęs naudotojas;
-	Peržiūrėti visų naudotojų sąrašą;
-	Peržiūrėti konkretaus naudotojo informaciją;
-	Keisti naudotojo rolę ir vardą;
-	Pašalinti naudotoją.

## Sistemos architektūra
Klientinės dalies kūrimui bus naudojamas React Native (Expo) karkasas, leidžiantis tą pačią aplikaciją naudoti mobiliuosiuose įrenginiuose ir naršyklėje;
Serverio dalis bus kuriama naudojant Node.js, Express karkasą ir TypeScript kalbą, o duomenų bazei pasiekti – „Prisma“ ORM biblioteką;
Duomenų bazei bus naudojama PostgreSQL duomenų bazės valdymo sistema;
Autentifikacijai ir autorizacijai bus naudojami JWT žetonai: trumpalaikis prieigos žetonas (15 min.) ir ilgalaikis atnaujinimo žetonas (30 d.), kuris keičiamas nauju kiekvieno atnaujinimo metu;
Sistema bus talpinama debesyje naudojant „Vercel“ platformą.

# Pagrindiniai taikomosios srities objektai
Sąskaita (Account) -> Operacija (Transaction) -> Pastaba (Note)