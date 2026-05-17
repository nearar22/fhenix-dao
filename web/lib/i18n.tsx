'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

export type Locale = 'en' | 'ar' | 'fr';

const STRINGS = {
  en: {
    // Header
    'app.tagline': 'Confidential DAO voting · Fhenix CoFHE',
    'header.contract': 'Contract',
    'header.connect': 'Connect wallet',
    // Hero
    'hero.badge': 'Powered by Fhenix CoFHE · Sepolia',
    'hero.title1': 'Vote on-chain.',
    'hero.title2': 'Stay invisible.',
    'hero.subtitle':
      'Fhenix DAO is a confidential DAO voting dApp where every ballot is encrypted in your browser and tallied homomorphically on-chain. Neither validators nor the contract owner can see individual votes. Yet final results are fully verifiable.',
    'hero.cta': 'Try it now',
    'hero.source': 'View source',
    'hero.scroll': 'See live proposals',
    'hero.f1': 'Encrypted ciphertexts',
    'hero.f2': 'Quadratic + Standard',
    'hero.f3': 'Threshold-signed results',
    'hero.caption': 'euint8 → euint32',
    'header.installMM': 'Install MetaMask',
    // Stats
    'stats.proposals': 'Proposals',
    'stats.ballots': 'Encrypted ballots',
    'stats.revealed': 'Verifiably revealed',
    // How
    'how.kicker': 'How it works',
    'how.title1': 'Privacy and verifiability,',
    'how.title2': 'on the same ledger',
    'how.s1.title': 'Encrypt locally',
    'how.s1.body':
      "Your ballot never leaves your browser as plaintext. The CoFHE SDK encrypts your choice with a freshly-derived key + ZK proof so the contract knows it's well-formed without seeing it.",
    'how.s2.title': 'Tally homomorphically',
    'how.s2.body':
      'The contract adds your encrypted vote to encrypted running totals using FHE.add, FHE.eq, FHE.select. Live tallies stay encrypted on-chain. Even validators see only ciphertexts.',
    'how.s3.title': 'Reveal verifiably',
    'how.s3.body':
      'After the deadline, the CoFHE Threshold Network signs the decryption of each tally. Anyone can publish the signed plaintext on-chain: non-forgeable, non-collusion-prone.',
    'how.step': 'Step',
    // Proposals
    'props.title': 'Live proposals',
    'props.total': 'total',
    'props.empty': 'No proposals yet.',
    'props.empty.owner': 'Create the first one above.',
    'props.connect.title': 'Connect your wallet to vote',
    'props.connect.body':
      "Sepolia testnet · you'll need a tiny bit of test ETH",
    'props.filter.all': 'All',
    // Categories
    'cat.general': 'General',
    'cat.treasury': 'Treasury',
    'cat.tech': 'Tech',
    'cat.governance': 'Governance',
    'cat.community': 'Community',
    // Card
    'card.proposal': 'Proposal',
    'card.voter': 'voter',
    'card.voters': 'voters',
    'card.standard': 'Standard',
    'card.quadratic': 'Quadratic',
    'card.finalized': 'Finalized',
    'card.awaiting': 'Awaiting finalize',
    'card.timeleft.closed': 'Voting closed',
    'card.cast': 'Cast encrypted vote',
    'card.cast.qv': 'Cast encrypted quadratic ballot',
    'card.voted':
      'Your encrypted vote is on-chain. Results will appear after the deadline.',
    'card.finalize': 'Finalize & reveal results',
    'card.demo': '⚡ Demo finalize (simulated)',
    'card.demo.badge': 'DEMO',
    'card.demo.note': 'Simulated results — CoFHE Threshold Network is currently unreachable. Real finalize will work when the network is back online.',
    'card.quorum': 'Participation',
    'card.leader.peek': 'Peek the encrypted leader without revealing tallies',
    'card.leader.leading': 'Currently leading',
    'card.leader.sealed': 'counts stay encrypted',
    'card.leader.reveal': 'Reveal leader',
    'card.leader.refresh': 'Refresh',
    'card.qv.budget': 'Quadratic voting budget',
    'card.qv.budget.body':
      'You have 100 credits. Each vote costs vote² credits per option. Your allocation is encrypted client-side. Nobody (not even the chain) sees how you split your credits.',
    'card.qv.used': 'Credits used',
    'card.qv.cost': 'cost',
    'card.results.total': 'Total votes',
    // Create
    'create.title': 'Create proposal',
    'create.mech': 'Voting mechanism',
    'create.mech.std.body': '1 voter = 1 vote on a single option.',
    'create.mech.qv.body': '100 credits/voter. Cost = votes² per option.',
    'create.category': 'Category',
    'create.desc': 'Description',
    'create.desc.placeholder': 'Should the DAO fund project X?',
    'create.options': 'Options',
    'create.options.add': 'Add option',
    'create.duration': 'Duration (hours)',
    'create.submit': 'Create proposal',
    'create.submit.pending': 'Confirm in wallet…',
    'create.submit.creating': 'Creating…',
    // Activity
    'activity.title': 'Recent activity',
    'activity.empty': 'No activity yet.',
    'activity.created': 'Proposal #{id} created',
    'activity.voted': 'Encrypted vote on #{id}',
    'activity.peeked': 'Leader peeked on #{id}',
    'activity.finalized': 'Proposal #{id} finalized',
    // Footer
    'footer.built': 'Built with ✨ on',
    'footer.contract': 'Contract',
    'footer.source': 'Source',
  },
  ar: {
    'app.tagline': 'تصويت DAO سري · Fhenix CoFHE',
    'header.contract': 'العقد',
    'header.connect': 'ربط المحفظة',
    'hero.badge': 'مدعوم بـ Fhenix CoFHE · شبكة Sepolia',
    'hero.title1': 'صوّت على البلوكشين.',
    'hero.title2': 'وابقَ مجهولًا.',
    'hero.subtitle':
      'Fhenix DAO تطبيق تصويت سري للـ DAO يتم تشفير كل ورقة اقتراع في متصفحك وتجميع النتائج بشكل تماثلي على البلوكشين. لا المُصدّقون ولا مالك العقد يستطيع رؤية الأصوات الفردية. ومع ذلك تبقى النتائج النهائية قابلة للتحقق بالكامل.',
    'hero.cta': 'جرّبه الآن',
    'hero.source': 'الكود المصدري',
    'hero.scroll': 'شاهد المقترحات الحية',
    'hero.f1': 'نصوص مشفّرة',
    'hero.f2': 'تربيعي + قياسي',
    'hero.f3': 'نتائج موقّعة عتبيًا',
    'hero.caption': 'euint8 ← euint32',
    'header.installMM': 'ثبّت MetaMask',
    'stats.proposals': 'مقترحات',
    'stats.ballots': 'أصوات مشفرة',
    'stats.revealed': 'مُكشفة بتحقق',
    'how.kicker': 'كيف يعمل',
    'how.title1': 'الخصوصية والتحقق،',
    'how.title2': 'على نفس السجل',
    'how.s1.title': 'تشفير محلي',
    'how.s1.body':
      'لا تغادر ورقة اقتراعك المتصفح إلا مشفّرة. SDK من CoFHE يشفّر اختيارك مع إثبات صفرية المعرفة، فيتأكد العقد أن الصوت سليم بدون رؤيته.',
    'how.s2.title': 'تجميع تماثلي',
    'how.s2.body':
      'العقد يضيف صوتك المشفّر إلى المجاميع المشفّرة باستخدام FHE.add و FHE.eq و FHE.select. المجاميع تبقى مشفّرة حتى لدى المُصدّقين.',
    'how.s3.title': 'الكشف بتحقق',
    'how.s3.body':
      'بعد انتهاء المهلة، شبكة عتبة CoFHE توقّع فك التشفير لكل مجموع. أي شخص يمكنه نشر النتيجة الموقّعة على البلوكشين، بدون تزوير ولا تواطؤ.',
    'how.step': 'خطوة',
    'props.title': 'المقترحات الحية',
    'props.total': 'إجمالي',
    'props.empty': 'لا توجد مقترحات بعد.',
    'props.empty.owner': 'أنشئ أول مقترح أعلاه.',
    'props.connect.title': 'اربط محفظتك للتصويت',
    'props.connect.body': 'شبكة Sepolia · تحتاج قليلًا من ETH الاختبارية',
    'props.filter.all': 'الكل',
    'cat.general': 'عام',
    'cat.treasury': 'الخزينة',
    'cat.tech': 'تقني',
    'cat.governance': 'حوكمة',
    'cat.community': 'مجتمع',
    'card.proposal': 'مقترح',
    'card.voter': 'مصوّت',
    'card.voters': 'مصوّتون',
    'card.standard': 'قياسي',
    'card.quadratic': 'تربيعي',
    'card.finalized': 'منتهٍ',
    'card.awaiting': 'بانتظار الإنهاء',
    'card.timeleft.closed': 'انتهى التصويت',
    'card.cast': 'أرسل صوت مشفّر',
    'card.cast.qv': 'أرسل بطاقة تربيعية مشفّرة',
    'card.voted':
      'صوتك المشفّر على البلوكشين. النتائج ستظهر بعد المهلة.',
    'card.finalize': 'إنهاء وكشف النتائج',
    'card.demo': '⚡ إنهاء تجريبي (محاكاة)',
    'card.demo.badge': 'تجريبي',
    'card.demo.note': 'نتائج محاكاة — شبكة عتبة CoFHE غير متاحة حاليًا. الإنهاء الحقيقي سيعمل عندما تعود الشبكة.',
    'card.quorum': 'المشاركة',
    'card.leader.peek': 'اطّلع على المتصدّر المشفّر بدون كشف المجاميع',
    'card.leader.leading': 'المتصدّر حاليًا',
    'card.leader.sealed': 'المجاميع تبقى مشفّرة',
    'card.leader.reveal': 'اكشف المتصدّر',
    'card.leader.refresh': 'حدّث',
    'card.qv.budget': 'ميزانية التصويت التربيعي',
    'card.qv.budget.body':
      'لديك 100 رصيد. كل صوت يكلّف vote² لكل خيار. توزيعك مشفّر في متصفحك، ولا أحد، حتى البلوكشين، يرى توزيعك.',
    'card.qv.used': 'الأرصدة المستخدمة',
    'card.qv.cost': 'الكلفة',
    'card.results.total': 'إجمالي الأصوات',
    'create.title': 'إنشاء مقترح',
    'create.mech': 'آلية التصويت',
    'create.mech.std.body': 'مصوّت واحد = صوت واحد على خيار واحد.',
    'create.mech.qv.body': '100 رصيد لكل مصوّت. الكلفة = vote² لكل خيار.',
    'create.category': 'الفئة',
    'create.desc': 'الوصف',
    'create.desc.placeholder': 'هل يجب على الـ DAO تمويل المشروع X؟',
    'create.options': 'الخيارات',
    'create.options.add': 'أضف خيارًا',
    'create.duration': 'المدة (ساعات)',
    'create.submit': 'إنشاء المقترح',
    'create.submit.pending': 'وافق في المحفظة…',
    'create.submit.creating': 'جارٍ الإنشاء…',
    'activity.title': 'النشاط الأخير',
    'activity.empty': 'لا نشاط بعد.',
    'activity.created': 'تم إنشاء المقترح #{id}',
    'activity.voted': 'صوت مشفّر على #{id}',
    'activity.peeked': 'تم الكشف عن المتصدّر #{id}',
    'activity.finalized': 'تم إنهاء المقترح #{id}',
    'footer.built': 'صُنع بـ ✨ على',
    'footer.contract': 'العقد',
    'footer.source': 'المصدر',
  },
  fr: {
    'app.tagline': 'Vote DAO confidentiel · Fhenix CoFHE',
    'header.contract': 'Contrat',
    'header.connect': 'Connecter le portefeuille',
    'hero.badge': 'Propulsé par Fhenix CoFHE · Sepolia',
    'hero.title1': 'Votez on-chain.',
    'hero.title2': 'Restez invisible.',
    'hero.subtitle':
      "Fhenix DAO est une dApp de vote DAO confidentielle où chaque bulletin est chiffré dans votre navigateur et comptabilisé de manière homomorphe on-chain. Ni les validateurs, ni le propriétaire du contrat ne voient les votes individuels. Pourtant les résultats finaux restent entièrement vérifiables.",
    'hero.cta': 'Essayer maintenant',
    'hero.source': 'Voir le code',
    'hero.scroll': 'Voir les propositions',
    'hero.f1': 'Chiffrés homomorphes',
    'hero.f2': 'Quadratique + Standard',
    'hero.f3': 'Résultats signés à seuil',
    'hero.caption': 'euint8 → euint32',
    'header.installMM': 'Installer MetaMask',
    'stats.proposals': 'Propositions',
    'stats.ballots': 'Bulletins chiffrés',
    'stats.revealed': 'Révélés vérifiablement',
    'how.kicker': 'Comment ça marche',
    'how.title1': 'Confidentialité et vérifiabilité,',
    'how.title2': 'sur le même registre',
    'how.s1.title': 'Chiffrer localement',
    'how.s1.body':
      "Votre bulletin ne quitte jamais votre navigateur en clair. Le SDK CoFHE chiffre votre choix avec une preuve ZK pour que le contrat sache qu'il est bien formé sans le voir.",
    'how.s2.title': 'Compter homomorphiquement',
    'how.s2.body':
      "Le contrat ajoute votre vote chiffré aux totaux chiffrés via FHE.add, FHE.eq, FHE.select. Les totaux restent chiffrés on-chain. Même les validateurs ne voient que des ciphertexts.",
    'how.s3.title': 'Révéler de façon vérifiable',
    'how.s3.body':
      'Après la deadline, le réseau à seuil CoFHE signe le déchiffrement de chaque total. Quiconque peut publier le plaintext signé on-chain: infalsifiable, anti-collusion.',
    'how.step': 'Étape',
    'props.title': 'Propositions en cours',
    'props.total': 'au total',
    'props.empty': 'Aucune proposition pour le moment.',
    'props.empty.owner': 'Créez la première ci-dessus.',
    'props.connect.title': 'Connectez votre portefeuille pour voter',
    'props.connect.body': "Sepolia · vous aurez besoin d'un peu d'ETH de test",
    'props.filter.all': 'Tout',
    'cat.general': 'Général',
    'cat.treasury': 'Trésorerie',
    'cat.tech': 'Tech',
    'cat.governance': 'Gouvernance',
    'cat.community': 'Communauté',
    'card.proposal': 'Proposition',
    'card.voter': 'votant',
    'card.voters': 'votants',
    'card.standard': 'Standard',
    'card.quadratic': 'Quadratique',
    'card.finalized': 'Finalisée',
    'card.awaiting': 'En attente de finalisation',
    'card.timeleft.closed': 'Vote clos',
    'card.cast': 'Envoyer le vote chiffré',
    'card.cast.qv': 'Envoyer le bulletin quadratique chiffré',
    'card.voted':
      'Votre vote chiffré est on-chain. Les résultats apparaîtront après la deadline.',
    'card.finalize': 'Finaliser & révéler',
    'card.demo': '⚡ Finalisation démo (simulée)',
    'card.demo.badge': 'DÉMO',
    'card.demo.note': 'Résultats simulés — le réseau à seuil CoFHE est actuellement injoignable. La vraie finalisation fonctionnera quand le réseau sera de retour.',
    'card.quorum': 'Participation',
    'card.leader.peek':
      'Aperçu du leader chiffré sans révéler les totaux',
    'card.leader.leading': 'En tête actuellement',
    'card.leader.sealed': 'les totaux restent chiffrés',
    'card.leader.reveal': 'Révéler le leader',
    'card.leader.refresh': 'Rafraîchir',
    'card.qv.budget': 'Budget de vote quadratique',
    'card.qv.budget.body':
      'Vous avez 100 crédits. Chaque vote coûte vote² crédits par option. Votre allocation est chiffrée côté client. Personne, pas même la chaîne, ne voit comment vous répartissez.',
    'card.qv.used': 'Crédits utilisés',
    'card.qv.cost': 'coût',
    'card.results.total': 'Total des votes',
    'create.title': 'Créer une proposition',
    'create.mech': 'Mécanisme de vote',
    'create.mech.std.body': '1 votant = 1 vote sur une seule option.',
    'create.mech.qv.body': '100 crédits/votant. Coût = votes² par option.',
    'create.category': 'Catégorie',
    'create.desc': 'Description',
    'create.desc.placeholder': 'La DAO devrait-elle financer le projet X ?',
    'create.options': 'Options',
    'create.options.add': 'Ajouter une option',
    'create.duration': 'Durée (heures)',
    'create.submit': 'Créer la proposition',
    'create.submit.pending': 'Confirmer dans le portefeuille…',
    'create.submit.creating': 'Création…',
    'activity.title': 'Activité récente',
    'activity.empty': 'Aucune activité.',
    'activity.created': 'Proposition #{id} créée',
    'activity.voted': 'Vote chiffré sur #{id}',
    'activity.peeked': 'Leader révélé sur #{id}',
    'activity.finalized': 'Proposition #{id} finalisée',
    'footer.built': 'Conçu avec ✨ sur',
    'footer.contract': 'Contrat',
    'footer.source': 'Source',
  },
} as const;

type Key = keyof (typeof STRINGS)['en'];

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('fhinex.locale') as Locale | null)) ||
      null;
    if (saved && ['en', 'ar', 'fr'].includes(saved)) setLocale(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      try {
        localStorage.setItem('fhinex.locale', locale);
      } catch {}
    }
  }, [locale]);

  const t = (k: Key, vars?: Record<string, string | number>) => {
    const dict = STRINGS[locale] as Record<string, string>;
    let s = dict[k] ?? STRINGS.en[k] ?? k;
    if (vars) {
      for (const [name, val] of Object.entries(vars)) {
        s = s.replace(`{${name}}`, String(val));
      }
    }
    return s;
  };

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, dir: locale === 'ar' ? 'rtl' : 'ltr' }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
