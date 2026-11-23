/**
 * Kandungan kursus MOOC Solat Mercu Kejayaan.
 * Sumber: Nota dan Soalan.txt (7 modul + 20 soalan pentaksiran akhir).
 *
 * Jawapan betul TIDAK disimpan di sini untuk tujuan pemarkahan — hanya
 * `correctAnswer` digunakan untuk menjana `question_keys` di Supabase.
 * Frontend menghantar jawapan ke RPC; RPC yang mengesahkan markah.
 */

export type SlideType = "TEXT" | "QUOTE" | "SUMMARY" | "ACTIVITY";

export interface Slide {
  id: string;
  title: string;
  type: SlideType;
  body: string[];
  arabic?: string;
  sourcePage?: string;
  standard?: string;
}

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  points?: number;
}

export interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  questions: Question[];
}

export interface Module {
  id: string;
  num: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  slides: Slide[];
  quiz: Quiz;
}

export const COURSE = {
  id: "solat-mercu-kejayaan",
  title: "Solat Mercu Kejayaan",
  subtitle: "Pendidikan Islam Tingkatan 1",
  description:
    "Kursus MOOC interaktif tentang solat: maksud, dalil, syarat, rukun, sunat, akibat meninggalkan solat, kelebihan dari sudut sains dan khusyuk.",
} as const;

export const MODULES: Module[] = [
  {
    id: "modul-1-pengenalan-dalil",
    num: "Modul 1",
    title: "Pengenalan, Maksud dan Dalil Kewajipan Solat",
    description:
      "Mengenali kedudukan solat dalam Islam, maksud solat, sejarah pensyariatan, hukum dan dalil naqli kewajipannya.",
    order: 1,
    estimatedMinutes: 25,
    slides: [
      {
        id: "m1-s1",
        title: "Pengenalan Ibadah Solat",
        type: "TEXT",
        body: [
          "Solat merupakan tiang agama Islam yang menjadi penghubung utama antara seorang hamba dengan Penciptanya.",
          "Solat ialah ibadah yang paling awal disyariatkan dalam Islam.",
          "Solat juga merupakan amalan pertama yang akan dihitung ke atas setiap manusia pada hari akhirat kelak.",
          "Rasulullah SAW menegaskan kedudukan solat dalam hadis riwayat al-Tirmizi, Ibnu Majah dan Ahmad daripada Mu'az bin Jabal RA yang bermaksud: “Asas segala urusan ialah Islam, tiangnya solat dan puncaknya jihad.”",
        ],
        sourcePage: "Nota Modul 1",
        standard: "1.1",
      },
      {
        id: "m1-s2",
        title: "Maksud Solat",
        type: "TEXT",
        body: [
          "Dari segi bahasa: doa.",
          "Dari segi istilah: perbuatan dan perkataan tertentu yang dimulakan dengan takbiratul ihram dan diakhiri dengan salam.",
        ],
        sourcePage: "Nota Modul 1",
        standard: "1.2",
      },
      {
        id: "m1-s3",
        title: "Sejarah Pensyariatan dan Hukum Solat",
        type: "TEXT",
        body: [
          "Ibadah solat mula difardukan pada malam peristiwa Israk dan Mikraj, iaitu dua tahun sebelum peristiwa hijrah Rasulullah SAW ke Madinah.",
          "Hukum menunaikan solat fardu lima waktu adalah tuntutan fardu ain ke atas setiap individu Muslim yang mukallaf.",
        ],
        sourcePage: "Nota Modul 1",
        standard: "1.3",
      },
      {
        id: "m1-s4",
        title: "Dalil Al-Quran",
        type: "QUOTE",
        body: [
          "Firman Allah SWT dalam Surah Al-Baqarah (2:43).",
          "Maksudnya: “Dirikanlah solat, tunaikanlah zakat dan rukuklah (berjemaah) bersama-sama dengan orang yang rukuk (solat).”",
          "Dalil ini menunjukkan kewajipan mendirikan solat dan melaksanakannya secara berjemaah.",
        ],
        arabic:
          "وَأَقِيمُوا الصَّلَاةَ وَءَاتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ",
        sourcePage: "Nota Modul 1",
        standard: "1.4",
      },
      {
        id: "m1-s5",
        title: "Dalil Hadis",
        type: "QUOTE",
        body: [
          "Sabda Rasulullah SAW yang diriwayatkan oleh Abdullah bin Umar RA (Muttafaqun 'Alaih).",
          "Maksudnya: “Islam terbina atas lima perkara, iaitu bersaksi bahawa tiada Tuhan yang layak disembah melainkan Allah dan Nabi Muhammad pesuruh Allah, mendirikan solat, mengeluarkan zakat, mengerjakan haji di Baitullah, dan berpuasa pada bulan Ramadan.”",
          "Hadis ini meletakkan solat sebagai salah satu daripada lima rukun Islam.",
        ],
        arabic:
          "بُنِيَ الْإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ الْبَيْتِ، وَصَوْمِ رَمَضَانَ.",
        sourcePage: "Nota Modul 1",
        standard: "1.4",
      },
      {
        id: "m1-s6",
        title: "Rumusan Modul 1",
        type: "SUMMARY",
        body: [
          "Solat ialah tiang agama, ibadah paling awal disyariatkan dan amalan pertama yang dihitung di akhirat.",
          "Solat bermaksud doa dari segi bahasa, dan perbuatan serta perkataan tertentu dari segi istilah.",
          "Solat difardukan pada malam Israk dan Mikraj dan hukumnya fardu ain ke atas setiap Muslim mukallaf.",
        ],
        sourcePage: "Rumusan Modul 1",
        standard: "1.5",
      },
    ],
    quiz: {
      id: "quiz-m1",
      title: "Kuiz Modul 1: Pengenalan dan Dalil Solat",
      passingScore: 80,
      questions: [
        {
          id: "m1-q1",
          question: "Apakah maksud solat dari segi bahasa?",
          optionA: "Doa",
          optionB: "Tunduk dan merendah diri",
          optionC: "Perbuatan dan perkataan tertentu",
          optionD: "Menumpukan hati di hadapan Allah",
          correctAnswer: "A",
          explanation: "Dari segi bahasa, solat bermaksud doa.",
        },
        {
          id: "m1-q2",
          question: "Bilakah ibadah solat mula difardukan ke atas umat Islam?",
          optionA: "Malam peristiwa Israk dan Mikraj, dua tahun sebelum hijrah",
          optionB: "Selepas peristiwa hijrah ke Madinah",
          optionC: "Pada tahun pertama hijrah",
          optionD: "Pada malam Lailatul Qadar",
          correctAnswer: "A",
          explanation: "Solat difardukan pada malam Israk dan Mikraj, dua tahun sebelum hijrah.",
        },
        {
          id: "m1-q3",
          question: "Apakah hukum menunaikan solat fardu lima waktu bagi setiap Muslim mukallaf?",
          optionA: "Fardu ain",
          optionB: "Fardu kifayah",
          optionC: "Sunat muakkad",
          optionD: "Sunat ghairu muakkad",
          correctAnswer: "A",
          explanation: "Solat fardu lima waktu ialah tuntutan fardu ain ke atas setiap individu Muslim mukallaf.",
        },
        {
          id: "m1-q4",
          question: "Antara berikut, yang manakah BUKAN keistimewaan ibadah solat?",
          optionA: "Ibadah yang paling awal disyariatkan",
          optionB: "Amalan pertama yang dihitung pada hari akhirat",
          optionC: "Tiang agama Islam",
          optionD: "Ibadah yang boleh ditinggalkan ketika sibuk",
          correctAnswer: "D",
          explanation: "Solat tidak boleh ditinggalkan; ia tiang agama dan amalan pertama yang dihitung.",
        },
        {
          id: "m1-q5",
          question: "Apakah terjemahan Surah Al-Baqarah ayat 43 yang menjadi dalil kewajipan solat?",
          optionA: "Dirikanlah solat, tunaikanlah zakat dan rukuklah bersama-sama orang yang rukuk",
          optionB: "Berpuasalah pada bulan Ramadan",
          optionC: "Tunaikanlah haji di Baitullah",
          optionD: "Berimanlah kepada kitab-kitab Allah",
          correctAnswer: "A",
          explanation: "Ayat 43 menyuruh mendirikan solat, menunaikan zakat dan rukuk bersama orang yang rukuk.",
        },
      ],
    },
  },
  {
    id: "modul-2-syarat-pembatal",
    num: "Modul 2",
    title: "Syarat Wajib, Syarat Sah dan Perkara yang Membatalkan Solat",
    description:
      "Memahami 4 syarat wajib, 5 syarat sah dan 12 perkara yang membatalkan solat.",
    order: 2,
    estimatedMinutes: 30,
    slides: [
      {
        id: "m2-s1",
        title: "Syarat Wajib Solat",
        type: "TEXT",
        body: [
          "Syarat wajib ialah perkara yang menentukan sama ada seseorang itu diwajibkan menunaikan solat atau tidak.",
          "Islam: tidak wajib ke atas orang bukan Islam.",
          "Baligh: telah mencapai umur dewasa mengikut hukum syarak.",
          "Berakal: waras dan tidak gila.",
          "Suci daripada haid dan nifas bagi golongan perempuan.",
        ],
        sourcePage: "Nota Modul 2",
        standard: "2.1",
      },
      {
        id: "m2-s2",
        title: "Syarat Sah Solat",
        type: "TEXT",
        body: [
          "Syarat sah ialah perkara yang mesti dipenuhi sebelum memulakan solat agar solat diterima dan sah di sisi syarak.",
          "Yakin masuk waktu solat yang hendak ditunaikan.",
          "Menutup aurat dengan sempurna mengikut batas syarak.",
          "Suci daripada najis pada badan, pakaian dan tempat solat.",
          "Suci daripada hadas kecil dan hadas besar.",
          "Menghadap ke arah kiblat.",
        ],
        sourcePage: "Nota Modul 2",
        standard: "2.2",
      },
      {
        id: "m2-s3",
        title: "Perkara yang Membatalkan Solat (1–6)",
        type: "TEXT",
        body: [
          "1. Berhadas sebelum memberi salam yang pertama.",
          "2. Bercakap dengan sengaja walaupun sedikit.",
          "3. Meninggalkan salah satu daripada rukun solat.",
          "4. Hilang ingatan disebabkan gila, pengsan atau mabuk.",
          "5. Terkena najis pada pakaian, badan atau tempat solat.",
          "6. Pergerakan anggota besar seperti kepala, badan, tangan dan kaki sebanyak tiga kali berturut-turut.",
        ],
        sourcePage: "Nota Modul 2",
        standard: "2.3",
      },
      {
        id: "m2-s4",
        title: "Perkara yang Membatalkan Solat (7–12)",
        type: "TEXT",
        body: [
          "7. Berdehem, ketawa, menangis kuat, mengerang kesakitan atau menghembus dengan mulut atau hidung jika zahir dua huruf atau satu huruf yang dapat difahami.",
          "8. Makan atau minum.",
          "9. Murtad (keluar daripada agama Islam).",
          "10. Berpaling dada daripada arah kiblat.",
          "11. Terbuka aurat dengan sengaja.",
          "12. Berniat untuk memberhentikan solat atau berubah niat.",
        ],
        sourcePage: "Nota Modul 2",
        standard: "2.3",
      },
      {
        id: "m2-s5",
        title: "Rumusan Modul 2",
        type: "SUMMARY",
        body: [
          "Terdapat 4 syarat wajib solat: Islam, baligh, berakal, dan suci daripada haid serta nifas.",
          "Terdapat 5 syarat sah solat: yakin masuk waktu, menutup aurat, suci daripada najis, suci daripada hadas, dan menghadap kiblat.",
          "Terdapat 12 perkara yang membatalkan solat, antaranya bercakap dengan sengaja, makan atau minum, dan meninggalkan rukun.",
        ],
        sourcePage: "Rumusan Modul 2",
        standard: "2.4",
      },
    ],
    quiz: {
      id: "quiz-m2",
      title: "Kuiz Modul 2: Syarat dan Pembatal Solat",
      passingScore: 80,
      questions: [
        {
          id: "m2-q1",
          question: "Antara berikut, yang manakah syarat wajib solat?",
          optionA: "Suci daripada haid dan nifas",
          optionB: "Menghadap kiblat",
          optionC: "Menutup aurat",
          optionD: "Yakin masuk waktu",
          correctAnswer: "A",
          explanation: "Syarat wajib solat: Islam, baligh, berakal, dan suci daripada haid serta nifas.",
        },
        {
          id: "m2-q2",
          question: "Berapakah bilangan syarat sah solat?",
          optionA: "5",
          optionB: "4",
          optionC: "12",
          optionD: "13",
          correctAnswer: "A",
          explanation: "Terdapat 5 syarat sah solat.",
        },
        {
          id: "m2-q3",
          question: "Antara berikut, yang manakah membatalkan solat?",
          optionA: "Menggaru ringan sekali",
          optionB: "Bercakap dengan sengaja walaupun sedikit",
          optionC: "Menutup mata",
          optionD: "Berdiri tegak",
          correctAnswer: "B",
          explanation: "Bercakap dengan sengaja walaupun sedikit membatalkan solat.",
        },
        {
          id: "m2-q4",
          question:
            "Ahmad berhadas selepas salam pertama tetapi sebelum salam kedua. Apakah hukum solatnya?",
          optionA: "Batal dan wajib diulang",
          optionB: "Sah kerana berhadas selepas salam pertama tidak membatalkan",
          optionC: "Perlu sujud sahwi sahaja",
          optionD: "Perlu memperbaharui wuduk dan meneruskan salam",
          correctAnswer: "B",
          explanation:
            "Perkara yang membatalkan solat ialah berhadas sebelum salam yang pertama. Selepas salam pertama, solat sudah sempurna.",
        },
        {
          id: "m2-q5",
          question: "Antara berikut, yang manakah BUKAN perkara yang membatalkan solat?",
          optionA: "Makan atau minum",
          optionB: "Murtad",
          optionC: "Terbuka aurat dengan sengaja",
          optionD: "Membaca Surah Al-Fatihah",
          correctAnswer: "D",
          explanation: "Membaca Al-Fatihah ialah rukun solat, bukan pembatal.",
        },
      ],
    },
  },
  {
    id: "modul-3-rukun",
    num: "Modul 3",
    title: "Rukun-Rukun Solat",
    description:
      "Mengenal 13 rukun solat, kategori rukun qalbi, qauli dan fi'li serta kepentingan tertib.",
    order: 3,
    estimatedMinutes: 30,
    slides: [
      {
        id: "m3-s1",
        title: "Konsep Rukun Solat",
        type: "TEXT",
        body: [
          "Terdapat 13 rukun solat yang wajib ditunaikan dalam setiap solat.",
          "Solat akan terbatal dan tidak sah sekiranya mana-mana rukun ditinggalkan atau ditunaikan tidak mengikut tertib.",
        ],
        sourcePage: "Nota Modul 3",
        standard: "3.1",
      },
      {
        id: "m3-s2",
        title: "13 Rukun Solat (1–5)",
        type: "TEXT",
        body: [
          "1. Niat: dilakukan di dalam hati ketika takbiratul ihram serta merangkumi qasad, ta'arrud dan ta'yin.",
          "2. Berdiri tegak bagi orang yang mampu.",
          "3. Takbiratul ihram (melafazkan Allahu Akbar).",
          "4. Membaca Surah Al-Fatihah.",
          "5. Rukuk serta tamakninah (berhenti seketika sekadar kadar bacaan Subhanallah).",
        ],
        sourcePage: "Nota Modul 3",
        standard: "3.2",
      },
      {
        id: "m3-s3",
        title: "13 Rukun Solat (6–10)",
        type: "TEXT",
        body: [
          "6. Iktidal serta tamakninah.",
          "7. Sujud serta tamakninah.",
          "8. Duduk antara dua sujud serta tamakninah.",
          "9. Duduk ketika membaca tahiyat akhir.",
          "10. Membaca tahiyat akhir.",
        ],
        sourcePage: "Nota Modul 3",
        standard: "3.2",
      },
      {
        id: "m3-s4",
        title: "13 Rukun Solat (11–13)",
        type: "TEXT",
        body: [
          "11. Berselawat ke atas Nabi SAW dalam tahiyat akhir.",
          "12. Memberi salam yang pertama (Assalamualaikum warahmatullah).",
          "13. Tertib, iaitu melaksanakan semua rukun mengikut urutan yang ditetapkan.",
        ],
        sourcePage: "Nota Modul 3",
        standard: "3.2",
      },
      {
        id: "m3-s5",
        title: "Pembahagian Kategori Rukun Solat",
        type: "TEXT",
        body: [
          "Rukun Qalbi: rukun yang wajib diniatkan di dalam hati, iaitu niat.",
          "Rukun Qauli: rukun yang wajib dilafazkan dengan suara sekadar dapat didengari oleh telinga sendiri. Lima perkara: takbiratul ihram, Al-Fatihah, tahiyat akhir, selawat ke atas Nabi SAW, dan salam pertama.",
          "Rukun Fi'li: semua perbuatan fizikal dalam solat. Enam perkara: berdiri, rukuk, iktidal, sujud, duduk antara dua sujud, dan duduk ketika membaca tahiyat akhir.",
        ],
        sourcePage: "Nota Modul 3",
        standard: "3.3",
      },
      {
        id: "m3-s6",
        title: "Rumusan Modul 3",
        type: "SUMMARY",
        body: [
          "Terdapat 13 rukun solat yang wajib ditunaikan mengikut tertib.",
          "Rukun qalbi ialah niat; rukun qauli ialah bacaan yang dilafazkan; rukun fi'li ialah perbuatan fizikal.",
          "Meninggalkan mana-mana rukun menjadikan solat tidak sah.",
        ],
        sourcePage: "Rumusan Modul 3",
        standard: "3.4",
      },
    ],
    quiz: {
      id: "quiz-m3",
      title: "Kuiz Modul 3: Rukun Solat",
      passingScore: 80,
      questions: [
        {
          id: "m3-q1",
          question: "Berapakah jumlah keseluruhan rukun solat?",
          optionA: "13",
          optionB: "12",
          optionC: "5",
          optionD: "6",
          correctAnswer: "A",
          explanation: "Terdapat 13 rukun solat.",
        },
        {
          id: "m3-q2",
          question: "Apakah rukun qalbi dalam solat?",
          optionA: "Niat",
          optionB: "Takbiratul ihram",
          optionC: "Rukuk",
          optionD: "Salam",
          correctAnswer: "A",
          explanation: "Rukun qalbi ialah niat yang wajib diniatkan di dalam hati.",
        },
        {
          id: "m3-q3",
          question: "Antara berikut, yang manakah rukun qauli?",
          optionA: "Membaca Surah Al-Fatihah",
          optionB: "Sujud",
          optionC: "Berdiri tegak",
          optionD: "Duduk antara dua sujud",
          correctAnswer: "A",
          explanation: "Membaca Al-Fatihah ialah rukun qauli yang wajib dilafazkan.",
        },
        {
          id: "m3-q4",
          question: "Apakah tiga elemen utama yang perlu ada dalam niat solat?",
          optionA: "Qasad, ta'arrud dan ta'yin",
          optionB: "Qalbi, qauli dan fi'li",
          optionC: "Niat, rukuk dan sujud",
          optionD: "Takbir, Fatihah dan salam",
          correctAnswer: "A",
          explanation: "Niat perlu merangkumi qasad (tujuan), ta'arrud (menyatakan fardu) dan ta'yin (menentukan jenis solat).",
        },
        {
          id: "m3-q5",
          question: "Antara berikut, yang manakah rukun fi'li yang wajib disertakan tamakninah?",
          optionA: "Rukuk, iktidal, sujud dan duduk antara dua sujud",
          optionB: "Niat, Al-Fatihah dan tahiyat akhir",
          optionC: "Takbir, salam dan selawat",
          optionD: "Berdiri, membaca dan memberi salam",
          correctAnswer: "A",
          explanation: "Rukuk, iktidal, sujud dan duduk antara dua sujud wajib disertakan tamakninah.",
        },
      ],
    },
  },
  {
    id: "modul-4-sunat-ab-ad-hai-at",
    num: "Modul 4",
    title: "Sunat Ab'ad dan Sunat Hai'at",
    description:
      "Membezakan sunat ab'ad dan sunat hai'at, memahami sujud sahwi serta senarai amalan sunat dalam solat.",
    order: 4,
    estimatedMinutes: 30,
    slides: [
      {
        id: "m4-s1",
        title: "Sunat Ab'ad",
        type: "TEXT",
        body: [
          "Maksud: perbuatan sunat dalam solat yang apabila ditinggalkan tidak membatalkan solat, tetapi sunat digantikan dengan sujud sahwi.",
          "Tujuh perkara sunat ab'ad: duduk tahiyat awal; membaca tahiyat awal; berselawat ke atas Nabi SAW selepas tahiyat awal; berselawat ke atas keluarga Nabi SAW selepas tahiyat akhir; membaca doa qunut pada waktu Subuh; berdiri ketika membaca doa qunut; berselawat ke atas Nabi SAW dan keluarga baginda ketika membaca doa qunut.",
        ],
        sourcePage: "Nota Modul 4",
        standard: "4.1",
      },
      {
        id: "m4-s2",
        title: "Sujud Sahwi",
        type: "QUOTE",
        body: [
          "Sujud sahwi dilakukan sebelum memberi salam untuk menampung kekurangan dalam solat yang berlaku sama ada secara sengaja atau terlupa.",
          "Bacaan ketika sujud sahwi: Subhana man la yanamu wa la yashu.",
          "Maksudnya: “Maha Suci Allah yang tidak tidur dan tidak lupa.”",
        ],
        arabic: "سُبْحَانَ مَنْ لَا يَنَامُ وَلَا يَسْهُو",
        sourcePage: "Nota Modul 4",
        standard: "4.2",
      },
      {
        id: "m4-s3",
        title: "Sunat Hai'at (1–8)",
        type: "TEXT",
        body: [
          "Maksud: perbuatan sunat dalam solat yang apabila ditinggalkan tidak membatalkan solat dan tidak perlu digantikan dengan sujud sahwi.",
          "1. Mengangkat kedua-dua belah tangan ketika takbiratul ihram, rukuk, iktidal dan bangun dari tahiyat awal.",
          "2. Meletakkan tangan kanan di atas belakang tangan kiri ketika berdiri.",
          "3. Melihat ke arah tempat sujud.",
          "4. Membaca doa iftitah.",
          "5. Membaca isti'azah sebelum membaca Surah Al-Fatihah.",
          "6. Menyebut Amin selepas membaca Surah Al-Fatihah.",
          "7. Membaca secara kuat (jahar) dan perlahan (sir) pada tempat-tempat tertentu.",
          "8. Melafazkan takbir ketika berpindah dari satu rukun ke rukun yang lain.",
        ],
        sourcePage: "Nota Modul 4",
        standard: "4.3",
      },
      {
        id: "m4-s4",
        title: "Sunat Hai'at (9–15)",
        type: "TEXT",
        body: [
          "9. Membaca mana-mana ayat Al-Quran selepas Surah Al-Fatihah.",
          "10. Membaca tasbih ketika rukuk dan sujud.",
          "11. Meletakkan kedua-dua belah tangan di atas paha ketika duduk tahiyat awal dan akhir.",
          "12. Duduk tawarruk ketika tahiyat akhir dan duduk iftirasy pada tempat selainnya.",
          "13. Membaca selawat Ibrahimiyah.",
          "14. Berpaling muka ke kanan ketika memberi salam yang pertama.",
          "15. Memberi salam yang kedua.",
        ],
        sourcePage: "Nota Modul 4",
        standard: "4.3",
      },
      {
        id: "m4-s5",
        title: "Rumusan Modul 4",
        type: "SUMMARY",
        body: [
          "Sunat ab'ad: jika ditinggalkan, disunatkan digantikan dengan sujud sahwi.",
          "Sunat hai'at: jika ditinggalkan, tidak membatalkan solat dan tidak perlu sujud sahwi.",
          "Sujud sahwi dilakukan sebelum salam dengan bacaan Subhana man la yanamu wa la yashu.",
        ],
        sourcePage: "Rumusan Modul 4",
        standard: "4.4",
      },
    ],
    quiz: {
      id: "quiz-m4",
      title: "Kuiz Modul 4: Sunat Ab'ad dan Hai'at",
      passingScore: 80,
      questions: [
        {
          id: "m4-q1",
          question: "Apakah perbezaan utama antara sunat ab'ad dengan sunat hai'at dari segi hukum meninggalkannya?",
          optionA: "Sunat ab'ad ditinggalkan perlu sujud sahwi, sunat hai'at tidak perlu",
          optionB: "Kedua-duanya perlu sujud sahwi",
          optionC: "Kedua-duanya tidak perlu sujud sahwi",
          optionD: "Sunat hai'at ditinggalkan perlu sujud sahwi, sunat ab'ad tidak",
          correctAnswer: "A",
          explanation: "Meninggalkan sunat ab'ad disunatkan digantikan dengan sujud sahwi; sunat hai'at tidak.",
        },
        {
          id: "m4-q2",
          question: "Bilakah sujud sahwi dilakukan?",
          optionA: "Sebelum memberi salam",
          optionB: "Selepas memberi salam",
          optionC: "Selepas solat sunat",
          optionD: "Pada awal solat",
          correctAnswer: "A",
          explanation: "Sujud sahwi dilakukan sebelum memberi salam.",
        },
        {
          id: "m4-q3",
          question: "Apakah bacaan ketika sujud sahwi?",
          optionA: "Subhana man la yanamu wa la yashu",
          optionB: "Subhanallah",
          optionC: "Alhamdulillah",
          optionD: "Allahu Akbar",
          correctAnswer: "A",
          explanation: "Bacaan sujud sahwi ialah Subhana man la yanamu wa la yashu.",
        },
        {
          id: "m4-q4",
          question: "Antara berikut, yang manakah termasuk dalam sunat ab'ad?",
          optionA: "Duduk tahiyat awal",
          optionB: "Membaca doa iftitah",
          optionC: "Membaca tasbih ketika rukuk",
          optionD: "Memberi salam yang kedua",
          correctAnswer: "A",
          explanation: "Duduk tahiyat awal ialah salah satu daripada tujuh sunat ab'ad.",
        },
        {
          id: "m4-q5",
          question: "Duduk tawarruk dilakukan ketika…",
          optionA: "Tahiyat akhir",
          optionB: "Tahiyat awal",
          optionC: "Duduk antara dua sujud",
          optionD: "Selepas salam",
          correctAnswer: "A",
          explanation: "Duduk tawarruk dilakukan ketika tahiyat akhir; duduk iftirasy pada tempat selainnya.",
        },
      ],
    },
  },
  {
    id: "modul-5-akibat-hikmah",
    num: "Modul 5",
    title: "Akibat Meninggalkan Solat dan Hikmah Solat",
    description:
      "Memahami dosa meninggalkan solat, dalil Al-Quran dan hadis, serta lapan hikmah solat dalam kehidupan.",
    order: 5,
    estimatedMinutes: 25,
    slides: [
      {
        id: "m5-s1",
        title: "Akibat Meninggalkan Solat",
        type: "TEXT",
        body: [
          "Orang yang meninggalkan solat fardu dengan sengaja menanggung dosa besar.",
          "Antara akibat buruknya ialah menjadi penghuni neraka berdasarkan Surah Al-Muddathir (74:42–43).",
          "Boleh menjadi kafir sekiranya seseorang menolak atau mengingkari kefarduan solat, berdasarkan hadis riwayat Muslim daripada Jabir RA.",
        ],
        sourcePage: "Nota Modul 5",
        standard: "5.1",
      },
      {
        id: "m5-s2",
        title: "Dalil Al-Quran dan Hadis",
        type: "QUOTE",
        body: [
          "Firman Allah SWT dalam Surah Al-Muddathir (74:42–43): “Apakah yang menyebabkan kamu masuk neraka Saqar? Mereka menjawab: Kerana kami dahulu orang-orang yang meninggalkan solat.”",
          "Hadis riwayat Muslim daripada Jabir RA: “(Perbezaan) antara seseorang itu dengan syirik dan kufur adalah meninggalkan solat.”",
        ],
        arabic:
          "مَا سَلَكَكُمْ فِي سَقَرَ ﴿٤٢﴾ قَالُوا لَمْ نَكُ مِنَ الْمُصَلِّينَ ﴿٤٣﴾",
        sourcePage: "Nota Modul 5",
        standard: "5.2",
      },
      {
        id: "m5-s3",
        title: "Hikmah Solat (1–4)",
        type: "TEXT",
        body: [
          "1. Memperoleh pahala yang melimpah dan meninggikan darjat di sisi Allah SWT.",
          "2. Menjadi penawar stres dan tekanan perasaan dalam kehidupan seharian.",
          "3. Melahirkan masyarakat yang harmoni dan bersatu padu.",
          "4. Mencegah diri daripada melakukan perbuatan keji dan mungkar.",
        ],
        sourcePage: "Nota Modul 5",
        standard: "5.3",
      },
      {
        id: "m5-s4",
        title: "Hikmah Solat (5–8)",
        type: "TEXT",
        body: [
          "5. Memberikan kebahagiaan hidup dan ketenangan jiwa.",
          "6. Menyembuhkan penyakit dengan izin Allah SWT.",
          "7. Membentuk disiplin diri dan akhlak yang mulia.",
          "8. Menjadikan hidup sentiasa selamat, diberkati dan dikasihi oleh Allah SWT.",
        ],
        sourcePage: "Nota Modul 5",
        standard: "5.3",
      },
      {
        id: "m5-s5",
        title: "Rumusan Modul 5",
        type: "SUMMARY",
        body: [
          "Meninggalkan solat dengan sengaja ialah dosa besar dan boleh menyebabkan seseorang menjadi kafir jika mengingkari kefarduannya.",
          "Solat membawa lapan hikmah utama kepada individu dan masyarakat.",
          "Hikmah solat merangkumi aspek rohani, mental, kesihatan, disiplin dan kemasyarakatan.",
        ],
        sourcePage: "Rumusan Modul 5",
        standard: "5.4",
      },
    ],
    quiz: {
      id: "quiz-m5",
      title: "Kuiz Modul 5: Akibat dan Hikmah Solat",
      passingScore: 80,
      questions: [
        {
          id: "m5-q1",
          question: "Apakah hukum bagi orang Islam yang meninggalkan solat fardu secara sengaja?",
          optionA: "Berdosa besar",
          optionB: "Berdosa kecil",
          optionC: "Harus",
          optionD: "Sunat",
          correctAnswer: "A",
          explanation: "Meninggalkan solat fardu dengan sengaja menanggung dosa besar.",
        },
        {
          id: "m5-q2",
          question: "Apakah nama neraka yang disebut dalam Surah Al-Muddathir ayat 42–43 bagi golongan yang meninggalkan solat?",
          optionA: "Neraka Saqar",
          optionB: "Neraka Jahannam",
          optionC: "Neraka Laza",
          optionD: "Neraka Hutamah",
          correctAnswer: "A",
          explanation: "Surah Al-Muddathir menyebut neraka Saqar.",
        },
        {
          id: "m5-q3",
          question: "Dalam keadaan bagaimanakah perbuatan meninggalkan solat boleh menyebabkan seseorang menjadi kafir?",
          optionA: "Apabila menolak atau mengingkari kefarduan solat",
          optionB: "Apabila meninggalkan solat kerana malas",
          optionC: "Apabila terlepas solat kerana tidur",
          optionD: "Apabila solat lambat",
          correctAnswer: "A",
          explanation: "Menolak atau mengingkari kefarduan solat boleh menyebabkan seseorang menjadi kafir.",
        },
        {
          id: "m5-q4",
          question: "Antara berikut, yang manakah hikmah solat terhadap kesihatan mental dan emosi?",
          optionA: "Menjadi penawar stres dan memberikan ketenangan jiwa",
          optionB: "Menambah harta kekayaan",
          optionC: "Menjadikan seseorang sombong",
          optionD: "Menjauhi masyarakat",
          correctAnswer: "A",
          explanation: "Solat menjadi penawar stres dan memberikan kebahagiaan serta ketenangan jiwa.",
        },
        {
          id: "m5-q5",
          question: "Bagaimanakah ibadah solat dapat memberi kesan positif kepada pembentukan masyarakat?",
          optionA: "Mencegah perbuatan keji dan mungkar serta melahirkan masyarakat harmoni",
          optionB: "Menyebabkan perpecahan masyarakat",
          optionC: "Menambah kemiskinan",
          optionD: "Menghalang pendidikan",
          correctAnswer: "A",
          explanation: "Solat mencegah keji dan mungkar serta melahirkan masyarakat yang harmoni.",
        },
      ],
    },
  },
  {
    id: "modul-6-sains",
    num: "Modul 6",
    title: "Kelebihan Solat dari Sudut Sains",
    description:
      "Meneliti manfaat saintifik setiap pergerakan solat serta tujuh anggota sujud.",
    order: 6,
    estimatedMinutes: 25,
    slides: [
      {
        id: "m6-s1",
        title: "Hubungan Pergerakan Solat dengan Kesihatan",
        type: "TEXT",
        body: [
          "Kajian saintifik membuktikan setiap pergerakan fizikal dalam solat memberikan pelbagai manfaat kepada psikologi dan kesihatan tubuh manusia.",
          "Kajian turut mendapati wujudnya kaitan antara waktu solat fardu dengan pengaruh hormon manusia.",
        ],
        sourcePage: "Nota Modul 6",
        standard: "6.1",
      },
      {
        id: "m6-s2",
        title: "Berdiri, Takbiratul Ihram dan Qiam",
        type: "TEXT",
        body: [
          "Meluruskan struktur tulang belakang.",
          "Membesarkan rongga dada dan berfungsi sebagai latihan pernafasan.",
          "Melancarkan pergerakan sendi serta dapat mengelakkan penyakit artritis.",
        ],
        sourcePage: "Nota Modul 6",
        standard: "6.2",
      },
      {
        id: "m6-s3",
        title: "Rukuk, Iktidal dan Sujud",
        type: "TEXT",
        body: [
          "Rukuk dan iktidal: mengelakkan risiko penyakit tulang belakang, menjadi terapi merawat dan mengurangkan sakit pinggang, memberikan ketenangan dan meningkatkan kewaspadaan.",
          "Sujud (selari dengan tarikan graviti): meningkatkan pengaliran darah dan bekalan oksigen ke otak; menjadikan kadar denyutan jantung dan tekanan darah lebih baik; membolehkan paru-paru berkembang dan mengelakkan tuberkulosis; meningkatkan penumpuan dan daya ingatan; melancarkan peredaran darah.",
        ],
        sourcePage: "Nota Modul 6",
        standard: "6.2",
      },
      {
        id: "m6-s4",
        title: "Jari Kaki, Iftirasy dan Tawarruk",
        type: "TEXT",
        body: [
          "Membengkokkan jari kaki ketika sujud, duduk iftirasy dan duduk tawarruk memberikan manfaat berikut:",
          "Meningkatkan kadar pembakaran lemak di dalam badan.",
          "Melancarkan pengaliran darah ke jantung.",
          "Merendahkan risiko penyakit jantung.",
        ],
        sourcePage: "Nota Modul 6",
        standard: "6.2",
      },
      {
        id: "m6-s5",
        title: "Kelebihan Sujud dan Tujuh Anggota Sujud",
        type: "SUMMARY",
        body: [
          "Saat yang paling hampir bagi seorang hamba dengan Tuhannya ialah ketika sujud; umat Islam digalakkan memperbanyakkan doa ketika sujud.",
          "Tujuh anggota sujud yang mesti diletakkan di atas tempat sujud: dahi, dua tapak tangan, dua lutut, dan dua hujung jari kedua-dua kaki.",
        ],
        sourcePage: "Nota Modul 6",
        standard: "6.3",
      },
    ],
    quiz: {
      id: "quiz-m6",
      title: "Kuiz Modul 6: Kelebihan Solat dari Sudut Sains",
      passingScore: 80,
      questions: [
        {
          id: "m6-q1",
          question: "Apakah manfaat pergerakan berdiri, takbiratul ihram dan qiam?",
          optionA: "Meluruskan struktur tulang belakang",
          optionB: "Membakar lemak dalam badan",
          optionC: "Menurunkan tekanan darah",
          optionD: "Mencegah tuberkulosis",
          correctAnswer: "A",
          explanation: "Berdiri dan qiam meluruskan tulang belakang serta membesarkan rongga dada.",
        },
        {
          id: "m6-q2",
          question: "Bagaimanakah pergerakan rukuk dan iktidal membantu masalah fizikal?",
          optionA: "Menjadi terapi merawat dan mengurangkan sakit pinggang",
          optionB: "Meningkatkan daya ingatan",
          optionC: "Membakar lemak",
          optionD: "Melancarkan darah ke jantung",
          correctAnswer: "A",
          explanation: "Rukuk dan iktidal mengelakkan sakit tulang belakang serta menjadi terapi sakit pinggang.",
        },
        {
          id: "m6-q3",
          question: "Apakah manfaat posisi sujud dari sudut sains?",
          optionA: "Meningkatkan pengaliran darah dan bekalan oksigen ke otak",
          optionB: "Meluruskan tulang belakang",
          optionC: "Mengelakkan artritis",
          optionD: "Membakar lemak",
          correctAnswer: "A",
          explanation: "Sujud meningkatkan pengaliran darah dan oksigen ke otak serta daya ingatan.",
        },
        {
          id: "m6-q4",
          question: "Apakah kebaikan membengkokkan jari kaki ketika sujud, iftirasy dan tawarruk?",
          optionA: "Merendahkan risiko penyakit jantung",
          optionB: "Meningkatkan daya ingatan",
          optionC: "Mengelakkan tuberkulosis",
          optionD: "Meluruskan tulang belakang",
          correctAnswer: "A",
          explanation: "Pergerakan ini melancarkan darah ke jantung dan merendahkan risiko penyakit jantung.",
        },
        {
          id: "m6-q5",
          question: "Apakah tujuh anggota sujud?",
          optionA: "Dahi, dua tapak tangan, dua lutut dan dua hujung jari kaki",
          optionB: "Dahi, dua mata, dua telinga dan dua tangan",
          optionC: "Kepala, dada, perut dan kaki",
          optionD: "Dua tangan, dua kaki, dua lutut dan satu dahi",
          correctAnswer: "A",
          explanation: "Tujuh anggota sujud: dahi, dua tapak tangan, dua lutut dan dua hujung jari kaki.",
        },
      ],
    },
  },
  {
    id: "modul-7-khusyuk",
    num: "Modul 7",
    title: "Khusyuk dalam Solat",
    description:
      "Memahami maksud, kepentingan, penghalang dan cara mendapatkan khusyuk dalam solat.",
    order: 7,
    estimatedMinutes: 30,
    slides: [
      {
        id: "m7-s1",
        title: "Maksud Khusyuk",
        type: "TEXT",
        body: [
          "Khusyuk merupakan kunci utama kesempurnaan ibadah solat. Seseorang yang khusyuk akan memperoleh kejayaan dan kebahagiaan hidup di dunia serta akhirat.",
          "Dari segi bahasa: senyap, tunduk dan merendah diri.",
          "Dari segi istilah: menumpukan hati di hadapan Allah SWT dengan menetapkan anggota, memahami serta menghayati setiap perkataan dan perbuatan dari awal hingga akhir solat.",
        ],
        sourcePage: "Nota Modul 7",
        standard: "7.1",
      },
      {
        id: "m7-s2",
        title: "Kepentingan Khusyuk (1–4)",
        type: "TEXT",
        body: [
          "1. Membentuk daya fokus terhadap tujuan hidup.",
          "2. Menjadi penghalang daripada melakukan kemungkaran.",
          "3. Dapat merasai nikmat menunaikan solat.",
          "4. Dapat merasai kemanisan iman.",
        ],
        sourcePage: "Nota Modul 7",
        standard: "7.2",
      },
      {
        id: "m7-s3",
        title: "Kepentingan Khusyuk (5–8)",
        type: "TEXT",
        body: [
          "5. Memberikan kekuatan rohani.",
          "6. Mendapat keampunan daripada Allah SWT.",
          "7. Menjadi jaminan solat diterima oleh Allah SWT.",
          "8. Dapat mencapai kejayaan dan kebahagiaan hidup.",
        ],
        sourcePage: "Nota Modul 7",
        standard: "7.2",
      },
      {
        id: "m7-s4",
        title: "Penghalang Khusyuk dalam Solat",
        type: "TEXT",
        body: [
          "1. Tidak memahami maksud bacaan dalam solat.",
          "2. Tidak menjaga adab ketika berwuduk.",
          "3. Mengambil makanan, minuman dan pakaian daripada sumber yang haram.",
          "4. Banyak melakukan dosa dan maksiat.",
          "5. Menunaikan solat dalam keadaan tergesa-gesa.",
          "6. Solat pada waktu makanan terhidang, ketika lapar atau mengantuk.",
          "7. Banyak memikirkan perkara keduniaan.",
        ],
        sourcePage: "Nota Modul 7",
        standard: "7.3",
      },
      {
        id: "m7-s5",
        title: "Cara Mendapatkan Khusyuk",
        type: "TEXT",
        body: [
          "Sebelum solat: menunaikan solat pada awal waktu; menyempurnakan wuduk dengan menjaga sunat dan adab; mendahulukan solat sunat rawatib; menjauhkan tempat solat daripada gangguan.",
          "Peranan hati: yakin Allah mengetahui setiap perlakuan; merasakan seolah-olah melihat Allah atau Allah sentiasa melihat kita; menghadirkan rasa gerun terhadap kehebatan Allah; menganggap solat yang ditunaikan sebagai solat terakhir.",
          "Peranan akal: memahami dan menghayati maksud bacaan; tidak memikirkan hal keduniaan.",
          "Peranan anggota: mata melihat ke arah tempat sujud ketika berdiri; tidak berpaling, menjeling atau melakukan pergerakan bukan daripada perbuatan solat.",
        ],
        sourcePage: "Nota Modul 7",
        standard: "7.4",
      },
      {
        id: "m7-s6",
        title: "Rumusan Modul 7",
        type: "SUMMARY",
        body: [
          "Khusyuk ialah menumpukan hati di hadapan Allah dengan memahami dan menghayati solat.",
          "Khusyuk membawa lapan kepentingan utama kepada rohani dan kehidupan.",
          "Penghalang khusyuk termasuk tidak memahami bacaan, sumber haram, dosa, tergesa-gesa dan fikiran dunia.",
        ],
        sourcePage: "Rumusan Modul 7",
        standard: "7.5",
      },
    ],
    quiz: {
      id: "quiz-m7",
      title: "Kuiz Modul 7: Khusyuk dalam Solat",
      passingScore: 80,
      questions: [
        {
          id: "m7-q1",
          question: "Apakah maksud khusyuk dari segi bahasa?",
          optionA: "Senyap, tunduk dan merendah diri",
          optionB: "Cepat dan tergesa-gesa",
          optionC: "Banyak bercakap",
          optionD: "Melihat sekeliling",
          correctAnswer: "A",
          explanation: "Khusyuk dari segi bahasa bermaksud senyap, tunduk dan merendah diri.",
        },
        {
          id: "m7-q2",
          question: "Antara berikut, yang manakah kepentingan khusyuk dalam solat?",
          optionA: "Dapat merasai kemanisan iman",
          optionB: "Menambah harta kekayaan",
          optionC: "Mendapat pujian manusia",
          optionD: "Menjauhi solat",
          correctAnswer: "A",
          explanation: "Khusyuk membolehkan seseorang merasai kemanisan iman.",
        },
        {
          id: "m7-q3",
          question: "Antara berikut, yang manakah penghalang khusyuk dalam solat?",
          optionA: "Mengambil makanan, minuman dan pakaian daripada sumber haram",
          optionB: "Berwuduk dengan sempurna",
          optionC: "Menunaikan solat pada awal waktu",
          optionD: "Menjauhkan tempat solat daripada gangguan",
          correctAnswer: "A",
          explanation: "Sumber haram menghalang kekhusyukan hati di hadapan Allah.",
        },
        {
          id: "m7-q4",
          question: "Apakah persediaan yang perlu dilakukan sebelum menunaikan solat untuk mencapai khusyuk?",
          optionA: "Menyempurnakan wuduk dan menunaikan solat pada awal waktu",
          optionB: "Makan sehingga kenyang",
          optionC: "Menunggu hingga akhir waktu",
          optionD: "Bercakap semasa solat",
          correctAnswer: "A",
          explanation: "Persediaan termasuk awal waktu, wuduk sempurna, rawatib dan menjauhkan gangguan.",
        },
        {
          id: "m7-q5",
          question: "Bagaimanakah peranan hati dapat membantu seseorang khusyuk semasa solat?",
          optionA: "Yakin Allah melihat kita dan menganggap solat sebagai solat terakhir",
          optionB: "Memikirkan perkara keduniaan",
          optionC: "Melihat ke sekeliling",
          optionD: "Bercakap dengan rakan",
          correctAnswer: "A",
          explanation: "Hati hendaklah yakin Allah melihat dan menganggap solat itu sebagai solat terakhir.",
        },
      ],
    },
  },
];

export const FINAL_QUIZ: Quiz = {
  id: "quiz-pentaksiran-akhir",
  title: "Pentaksiran Akhir — 20 Soalan",
  passingScore: 0,
  questions: [
    {
      id: "final-q01",
      question: "Apakah maksud solat dari segi bahasa?",
      optionA: "Tunduk dan merendah diri",
      optionB: "Doa",
      optionC: "Perbuatan dan perkataan tertentu",
      optionD: "Menumpukan hati di hadapan Allah SWT",
      correctAnswer: "B",
      explanation: "Solat dari segi bahasa bermaksud doa.",
    },
    {
      id: "final-q02",
      question: "Antara berikut, yang manakah merupakan syarat wajib solat?",
      optionA: "Menghadap kiblat",
      optionB: "Menutup aurat",
      optionC: "Suci daripada haid dan nifas",
      optionD: "Yakin masuk waktu",
      correctAnswer: "C",
      explanation: "Syarat wajib solat: Islam, baligh, berakal, dan suci daripada haid serta nifas.",
    },
    {
      id: "final-q03",
      question: "Pilih pernyataan yang tepat mengenai konsep Rukun Qauli dalam solat.",
      optionA: "Wajib diniatkan di dalam hati ketika permulaan solat",
      optionB: "Wajib dilafazkan dengan suara sekadar didengari oleh telinga sendiri",
      optionC: "Perbuatan fizikal yang wajib dilakukan mengikut tertib",
      optionD: "Bacaan sunat yang tidak perlu diganti dengan sujud sahwi sekiranya tertinggal",
      correctAnswer: "B",
      explanation: "Rukun qauli wajib dilafazkan dengan suara sekadar didengari telinga sendiri.",
    },
    {
      id: "final-q04",
      question:
        "Berdasarkan kajian sains, bagaimanakah pergerakan sujud dapat membantu meningkatkan daya ingatan dan kecerdasan otak?",
      optionA: "Mengurangkan kadar pembakaran lemak di dalam badan",
      optionB: "Meluruskan tulang belakang dan membesarkan rongga dada",
      optionC: "Meningkatkan pengaliran darah dan bekalan oksigen ke otak",
      optionD: "Melancarkan pergerakan sendi bagi mengelakkan penyakit artritis",
      correctAnswer: "C",
      explanation: "Sujud meningkatkan pengaliran darah dan oksigen ke otak sehingga daya ingatan meningkat.",
    },
    {
      id: "final-q05",
      question:
        "Ahmad sedang menunaikan solat Asar. Tiba-tiba beliau ketawa sehingga mengeluarkan bunyi dua huruf yang jelas. Apakah hukum solat Ahmad?",
      optionA: "Sah dan perlu diteruskan seperti biasa",
      optionB: "Sah tetapi disunatkan sujud sahwi sebelum salam",
      optionC: "Batal dan wajib diulangi semula solat Asar tersebut",
      optionD: "Makruh dan mengurangkan pahala khusyuk",
      correctAnswer: "C",
      explanation: "Ketawa sehingga zahir dua huruf yang difahami membatalkan solat.",
    },
    {
      id: "final-q06",
      question:
        "Siti terlupa membaca doa qunut ketika menunaikan solat Subuh dan terus turun untuk sujud. Apakah tindakan yang disunatkan ke atas Siti sebelum memberi salam?",
      optionA: "Melakukan sujud sahwi sambil membaca Subhana man la yanamu wa la yashu",
      optionB: "Berdiri semula untuk membaca doa qunut sebelum sujud",
      optionC: "Tidak perlu melakukan apa-apa kerana doa qunut ialah sunat hai'at",
      optionD: "Membatalkan solat dan mengulanginya dari takbiratul ihram",
      correctAnswer: "A",
      explanation: "Doa qunut ialah sunat ab'ad; jika tertinggal, disunatkan sujud sahwi.",
    },
    {
      id: "final-q07",
      question:
        "Analisiskan perbezaan antara dua situasi berikut. Situasi X: Karim membaca Surah Al-Fatihah di dalam hati tanpa menggerakkan bibir. Situasi Y: Zainal membaca doa iftitah di dalam hati tanpa suara. Apakah status sah solat bagi kedua-dua individu tersebut?",
      optionA: "Solat Karim sah manakala solat Zainal batal",
      optionB: "Solat Karim batal manakala solat Zainal sah",
      optionC: "Kedua-dua solat Karim dan Zainal adalah sah",
      optionD: "Kedua-dua solat Karim dan Zainal adalah batal",
      correctAnswer: "B",
      explanation:
        "Al-Fatihah ialah rukun qauli yang wajib dilafazkan; doa iftitah ialah sunat hai'at yang boleh dibaca dalam hati.",
    },
    {
      id: "final-q08",
      question:
        "Apakah perbezaan utama dari segi hukum antara orang yang meninggalkan solat kerana malas dengan orang yang meninggalkan solat kerana mengingkari kefarduannya?",
      optionA: "Kedua-duanya menjadi kafir serta-merta",
      optionB: "Kedua-duanya hanya menanggung dosa kecil",
      optionC: "Orang yang malas berdosa besar, manakala orang yang mengingkari kefarduannya boleh menjadi kafir",
      optionD: "Orang yang malas tidak perlu mengqada solat, manakala yang mengingkari wajib mengqadanya",
      correctAnswer: "C",
      explanation:
        "Meninggalkan solat kerana malas berdosa besar; mengingkari kefarduan solat boleh menyebabkan kufur.",
    },
    {
      id: "final-q09",
      question:
        "Faris menunaikan solat Zohor dengan menyempurnakan kesemua 13 rukun solat, namun beliau memakai pakaian yang dibeli daripada hasil wang curi. Nilaikan kesan perbuatan tersebut terhadap solat Faris berdasarkan tajuk khusyuk dalam solat.",
      optionA: "Solatnya terbatal secara automatik kerana sumber pakaian yang haram",
      optionB: "Solatnya terhalang daripada mencapai kemanisan khusyuk kerana memakai pakaian daripada sumber yang haram",
      optionC: "Solatnya tetap mencapai tahap khusyuk tertinggi kerana rukunnya sempurna",
      optionD: "Beliau wajib melakukan sujud sahwi untuk menyucikan pakaian tersebut",
      correctAnswer: "B",
      explanation: "Sumber haram menghalang kekhusyukan, tetapi tidak membatalkan solat secara automatik.",
    },
    {
      id: "final-q10",
      question:
        "Anda diminta menyusun satu urutan pelan persediaan diri sebelum solat yang paling tepat bagi memastikan ibadah solat yang ditunaikan sah dan mencapai tahap khusyuk yang optimum. Pilih susunan terbaik:",
      optionA: "Menunaikan solat sunat rawatib -> Berwuduk dengan sempurna -> Menutup aurat -> Menjauhkan tempat solat daripada gangguan",
      optionB: "Menyempurnakan wuduk dengan menjaga adabnya -> Menutup aurat dan menghadap kiblat -> Menjauhkan tempat solat daripada gangguan -> Mendahulukan solat sunat rawatib",
      optionC: "Menghadap kiblat -> Melafazkan takbiratul ihram -> Menyempurnakan wuduk -> Membaca doa iftitah",
      optionD: "Menunggu hingga akhir waktu -> Makan hingga kenyang -> Berwuduk secara tergesa-gesa -> Mendirikan solat",
      correctAnswer: "B",
      explanation: "Susunan logik: wuduk, menutup aurat dan kiblat, jauhkan gangguan, kemudian rawatib.",
    },
    {
      id: "final-q11",
      question:
        "Ibadah solat mula difardukan ke atas umat Islam pada malam peristiwa Israk dan Mikraj, iaitu dua tahun sebelum hijrah.",
      optionA: "Betul",
      optionB: "Salah",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "Solat difardukan pada malam Israk dan Mikraj, dua tahun sebelum hijrah.",
    },
    {
      id: "final-q12",
      question:
        "Meninggalkan perkara sunat hai'at seperti membaca tasbih ketika rukuk tidak membatalkan solat dan tidak perlu digantikan dengan sujud sahwi.",
      optionA: "Betul",
      optionB: "Salah",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "Sunat hai'at yang ditinggalkan tidak membatalkan solat dan tidak perlu sujud sahwi.",
    },
    {
      id: "final-q13",
      question:
        "Aiman menggaru pipinya menggunakan tangan sebanyak tiga kali berturut-turut semasa sedang membaca Surah Al-Fatihah. Tindakan Aiman tidak membatalkan solatnya kerana beliau tidak bercakap.",
      optionA: "Betul",
      optionB: "Salah",
      optionC: "",
      optionD: "",
      correctAnswer: "B",
      explanation:
        "Pergerakan anggota besar seperti tangan sebanyak tiga kali berturut-turut membatalkan solat.",
    },
    {
      id: "final-q14",
      question:
        "Membengkokkan jari kaki ketika sujud, duduk iftirasy dan duduk tawarruk berfungsi melancarkan pengaliran darah ke jantung serta merendahkan risiko penyakit jantung.",
      optionA: "Betul",
      optionB: "Salah",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      explanation: "Pergerakan tersebut melancarkan darah ke jantung dan merendahkan risiko penyakit jantung.",
    },
    {
      id: "final-q15",
      question:
        "Menunaikan solat dalam keadaan makanan kegemaran sudah terhidang dan perut sedang lapar adalah tindakan yang wajar untuk menguji tahap kesabaran dan khusyuk seseorang.",
      optionA: "Betul",
      optionB: "Salah",
      optionC: "",
      optionD: "",
      correctAnswer: "B",
      explanation:
        "Solat ketika makanan terhidang atau ketika lapar ialah penghalang khusyuk, bukan tindakan yang wajar.",
    },
    {
      id: "final-q16",
      question:
        "Padankan pernyataan berikut: Elemen niat yang menentukan jenis solat yang hendak ditunaikan seperti solat Zohor atau Asar.",
      optionA: "Ta'yin",
      optionB: "Qasad",
      optionC: "Ta'arrud",
      optionD: "Tawarruk",
      correctAnswer: "A",
      explanation: "Ta'yin ialah elemen niat yang menentukan jenis solat.",
    },
    {
      id: "final-q17",
      question:
        "Padankan pernyataan berikut: Nama neraka yang dihuni oleh golongan yang meninggalkan solat berdasarkan Surah Al-Muddathir ayat 42–43.",
      optionA: "Neraka Saqar",
      optionB: "Neraka Jahannam",
      optionC: "Neraka Laza",
      optionD: "Neraka Hutamah",
      correctAnswer: "A",
      explanation: "Surah Al-Muddathir menyebut neraka Saqar.",
    },
    {
      id: "final-q18",
      question:
        "Padankan pernyataan berikut: Cara duduk yang disunatkan ketika membaca tahiyat akhir dalam solat.",
      optionA: "Duduk Tawarruk",
      optionB: "Duduk Iftirasy",
      optionC: "Duduk Antara Dua Sujud",
      optionD: "Duduk Tahiyat Awal",
      correctAnswer: "A",
      explanation: "Duduk tawarruk disunatkan ketika tahiyat akhir.",
    },
    {
      id: "final-q19",
      question:
        "Padankan pernyataan berikut: Pergerakan solat yang menjadi terapi untuk merawat dan mengurangkan sakit pinggang dari sudut sains.",
      optionA: "Rukuk dan Iktidal",
      optionB: "Sujud",
      optionC: "Berdiri",
      optionD: "Salam",
      correctAnswer: "A",
      explanation: "Rukuk dan iktidal menjadi terapi sakit pinggang.",
    },
    {
      id: "final-q20",
      question:
        "Padankan pernyataan berikut: Tindakan dalaman yang dirangka semasa solat dengan meyakini Allah SWT melihat kita serta menganggapnya sebagai solat terakhir.",
      optionA: "Peranan Hati untuk Khusyuk",
      optionB: "Peranan Akal",
      optionC: "Peranan Anggota",
      optionD: "Peranan Guru",
      correctAnswer: "A",
      explanation: "Peranan hati termasuk yakin Allah melihat dan menganggap solat sebagai solat terakhir.",
    },
  ],
};

export const FINAL_QUESTION_COUNT = FINAL_QUIZ.questions.length;

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getModuleByQuizId(quizId: string): Module | undefined {
  return MODULES.find((m) => m.quiz.id === quizId);
}

export function getSlide(moduleId: string, slideId: string): Slide | undefined {
  return getModule(moduleId)?.slides.find((s) => s.id === slideId);
}
