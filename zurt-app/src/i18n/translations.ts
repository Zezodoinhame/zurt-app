export type Language = 'pt' | 'en' | 'zh' | 'ar';

export const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Tabs
    'tab.home': 'Home',
    'tab.wallet': 'Carteira',
    'tab.cards': 'Cartões',
    'tab.alerts': 'Alertas',
    'tab.profile': 'Perfil',

    // Home
    'home.totalPatrimony': 'Patrimônio total',
    'home.invested': 'Investido',
    'home.profit': 'Lucro',
    'home.evolution': 'Evolução patrimonial',
    'home.allocation': 'Alocação por classe',
    'home.connectedAccounts': 'Contas conectadas',
    'home.connectInstitution': '+ Conectar instituição',
    'home.insights': 'Insights',
    'home.viewDetails': 'Ver detalhes',
    'home.showValues': 'Mostrar valores',
    'home.hideValues': 'Ocultar valores',
    'home.notifications': 'Notificações',
    'home.unread': 'não lidas',

    // Greetings
    'greeting.morning': 'Bom dia',
    'greeting.afternoon': 'Boa tarde',
    'greeting.evening': 'Boa noite',

    // Wallet
    'wallet.title': 'Carteira',
    'wallet.byClass': 'Por classe',
    'wallet.byInstitution': 'Por instituição',
    'wallet.asset': 'Ativo',
    'wallet.assets': 'Ativos',
    'wallet.avgPrice': 'Preço médio',
    'wallet.currentPrice': 'Preço atual',
    'wallet.quantity': 'Quantidade',
    'wallet.investedValue': 'Valor investido',
    'wallet.currentValue': 'Valor atual',
    'wallet.profitability': 'Rentabilidade',
    'wallet.institution': 'Instituição',

    // Asset classes
    'class.fixedIncome': 'Renda Fixa',
    'class.stocks': 'Ações',
    'class.fiis': 'FIIs',
    'class.crypto': 'Cripto',
    'class.international': 'Internacional',
    'class.pension': 'Previdência',

    // Cards
    'cards.title': 'Cartões',
    'cards.currentInvoice': 'Fatura atual',
    'cards.nextInvoice': 'Próxima fatura',
    'cards.spendingByCategory': 'Gastos por categoria',
    'cards.transactions': 'Transações',
    'cards.noCards': 'Nenhum cartão conectado',

    // Categories
    'category.food': 'Alimentação',
    'category.transport': 'Transporte',
    'category.subscriptions': 'Assinaturas',
    'category.shopping': 'Compras',
    'category.fuel': 'Combustível',
    'category.health': 'Saúde',
    'category.travel': 'Viagem',
    'category.tech': 'Tecnologia',

    // Alerts
    'alerts.title': 'Alertas',
    'alerts.markAllRead': 'Marcar todas como lidas',
    'alerts.all': 'Todas',
    'alerts.distribution': 'Distribuição',
    'alerts.maturity': 'Vencimento',
    'alerts.invoice': 'Fatura',
    'alerts.insight': 'Insight',
    'alerts.system': 'Sistema',
    'alerts.noNotifications': 'Nenhuma notificação',
    'alerts.dismiss': 'Dispensar',

    // Profile
    'profile.security': 'Segurança',
    'profile.biometric': 'Biometria',
    'profile.changePassword': 'Alterar senha',
    'profile.changePin': 'Alterar PIN',
    'profile.preferences': 'Preferências',
    'profile.pushNotifications': 'Notificações push',
    'profile.hideValuesOnOpen': 'Ocultar valores ao abrir',
    'profile.language': 'Idioma',
    'profile.defaultCurrency': 'Moeda padrão',
    'profile.connectedAccounts': 'Contas conectadas',
    'profile.connectOpenFinance': 'Conectar via Open Finance',
    'profile.zurtToken': 'Token ZURT',
    'profile.tokenBalance': 'Saldo de tokens',
    'profile.revenueShare': 'Participação na receita',
    'profile.nextDistribution': 'Próxima distribuição',
    'profile.about': 'Sobre',
    'profile.terms': 'Termos de uso',
    'profile.privacy': 'Política de privacidade',
    'profile.help': 'Ajuda',
    'profile.support': 'Suporte',
    'profile.logout': 'Sair',
    'profile.logoutConfirm': 'Deseja realmente sair?',
    'profile.cancel': 'Cancelar',
    'profile.demoMode': 'Modo demonstração',
    'profile.demoUnavailable': 'Indisponível no modo demo',

    // Connection status
    'status.connected': 'Conectado',
    'status.syncing': 'Sincronizando...',
    'status.error': 'Erro na conexão',

    // Connect bank
    'connect.title': 'Conectar instituição',
    'connect.search': 'Buscar instituição...',
    'connect.connecting': 'Conectando...',
    'connect.success': 'Conectado com sucesso!',
    'connect.error': 'Erro ao conectar',

    // Change password
    'password.title': 'Alterar senha',
    'password.current': 'Senha atual',
    'password.new': 'Nova senha',
    'password.confirm': 'Confirmar senha',
    'password.save': 'Salvar',
    'password.success': 'Senha alterada com sucesso!',
    'password.error': 'Erro ao alterar senha',
    'password.mismatch': 'As senhas não coincidem',

    // Common
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.retry': 'Tentar novamente',
    'common.close': 'Fechar',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.ok': 'OK',

    // Languages
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.zh': '中文',
    'lang.ar': 'العربية',

    // Currencies
    'currency.BRL': 'BRL (R$)',
    'currency.USD': 'USD ($)',
    'currency.EUR': 'EUR (€)',
  },
  en: {
    // Tabs
    'tab.home': 'Home',
    'tab.wallet': 'Wallet',
    'tab.cards': 'Cards',
    'tab.alerts': 'Alerts',
    'tab.profile': 'Profile',

    // Home
    'home.totalPatrimony': 'Total patrimony',
    'home.invested': 'Invested',
    'home.profit': 'Profit',
    'home.evolution': 'Patrimony evolution',
    'home.allocation': 'Allocation by class',
    'home.connectedAccounts': 'Connected accounts',
    'home.connectInstitution': '+ Connect institution',
    'home.insights': 'Insights',
    'home.viewDetails': 'View details',
    'home.showValues': 'Show values',
    'home.hideValues': 'Hide values',
    'home.notifications': 'Notifications',
    'home.unread': 'unread',

    // Greetings
    'greeting.morning': 'Good morning',
    'greeting.afternoon': 'Good afternoon',
    'greeting.evening': 'Good evening',

    // Wallet
    'wallet.title': 'Wallet',
    'wallet.byClass': 'By class',
    'wallet.byInstitution': 'By institution',
    'wallet.asset': 'Asset',
    'wallet.assets': 'Assets',
    'wallet.avgPrice': 'Average price',
    'wallet.currentPrice': 'Current price',
    'wallet.quantity': 'Quantity',
    'wallet.investedValue': 'Invested value',
    'wallet.currentValue': 'Current value',
    'wallet.profitability': 'Profitability',
    'wallet.institution': 'Institution',

    // Asset classes
    'class.fixedIncome': 'Fixed Income',
    'class.stocks': 'Stocks',
    'class.fiis': 'REITs',
    'class.crypto': 'Crypto',
    'class.international': 'International',
    'class.pension': 'Pension',

    // Cards
    'cards.title': 'Cards',
    'cards.currentInvoice': 'Current invoice',
    'cards.nextInvoice': 'Next invoice',
    'cards.spendingByCategory': 'Spending by category',
    'cards.transactions': 'Transactions',
    'cards.noCards': 'No cards connected',

    // Categories
    'category.food': 'Food',
    'category.transport': 'Transport',
    'category.subscriptions': 'Subscriptions',
    'category.shopping': 'Shopping',
    'category.fuel': 'Fuel',
    'category.health': 'Health',
    'category.travel': 'Travel',
    'category.tech': 'Technology',

    // Alerts
    'alerts.title': 'Alerts',
    'alerts.markAllRead': 'Mark all as read',
    'alerts.all': 'All',
    'alerts.distribution': 'Distribution',
    'alerts.maturity': 'Maturity',
    'alerts.invoice': 'Invoice',
    'alerts.insight': 'Insight',
    'alerts.system': 'System',
    'alerts.noNotifications': 'No notifications',
    'alerts.dismiss': 'Dismiss',

    // Profile
    'profile.security': 'Security',
    'profile.biometric': 'Biometrics',
    'profile.changePassword': 'Change password',
    'profile.changePin': 'Change PIN',
    'profile.preferences': 'Preferences',
    'profile.pushNotifications': 'Push notifications',
    'profile.hideValuesOnOpen': 'Hide values on open',
    'profile.language': 'Language',
    'profile.defaultCurrency': 'Default currency',
    'profile.connectedAccounts': 'Connected accounts',
    'profile.connectOpenFinance': 'Connect via Open Finance',
    'profile.zurtToken': 'ZURT Token',
    'profile.tokenBalance': 'Token balance',
    'profile.revenueShare': 'Revenue share',
    'profile.nextDistribution': 'Next distribution',
    'profile.about': 'About',
    'profile.terms': 'Terms of use',
    'profile.privacy': 'Privacy policy',
    'profile.help': 'Help',
    'profile.support': 'Support',
    'profile.logout': 'Logout',
    'profile.logoutConfirm': 'Do you really want to logout?',
    'profile.cancel': 'Cancel',
    'profile.demoMode': 'Demo mode',
    'profile.demoUnavailable': 'Unavailable in demo mode',

    // Connection status
    'status.connected': 'Connected',
    'status.syncing': 'Syncing...',
    'status.error': 'Connection error',

    // Connect bank
    'connect.title': 'Connect institution',
    'connect.search': 'Search institution...',
    'connect.connecting': 'Connecting...',
    'connect.success': 'Successfully connected!',
    'connect.error': 'Connection error',

    // Change password
    'password.title': 'Change password',
    'password.current': 'Current password',
    'password.new': 'New password',
    'password.confirm': 'Confirm password',
    'password.save': 'Save',
    'password.success': 'Password changed successfully!',
    'password.error': 'Error changing password',
    'password.mismatch': 'Passwords do not match',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Try again',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.ok': 'OK',

    // Languages
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.zh': '中文',
    'lang.ar': 'العربية',

    // Currencies
    'currency.BRL': 'BRL (R$)',
    'currency.USD': 'USD ($)',
    'currency.EUR': 'EUR (€)',
  },
  zh: {
    // Tabs
    'tab.home': '首页',
    'tab.wallet': '钱包',
    'tab.cards': '卡片',
    'tab.alerts': '提醒',
    'tab.profile': '个人资料',

    // Home
    'home.totalPatrimony': '总资产',
    'home.invested': '已投资',
    'home.profit': '利润',
    'home.evolution': '资产演变',
    'home.allocation': '按类别分配',
    'home.connectedAccounts': '已连接账户',
    'home.connectInstitution': '+ 连接机构',
    'home.insights': '洞察',
    'home.viewDetails': '查看详情',
    'home.showValues': '显示数值',
    'home.hideValues': '隐藏数值',
    'home.notifications': '通知',
    'home.unread': '未读',

    // Greetings
    'greeting.morning': '早上好',
    'greeting.afternoon': '下午好',
    'greeting.evening': '晚上好',

    // Wallet
    'wallet.title': '钱包',
    'wallet.byClass': '按类别',
    'wallet.byInstitution': '按机构',
    'wallet.asset': '资产',
    'wallet.assets': '资产',
    'wallet.avgPrice': '平均价格',
    'wallet.currentPrice': '当前价格',
    'wallet.quantity': '数量',
    'wallet.investedValue': '投资价值',
    'wallet.currentValue': '当前价值',
    'wallet.profitability': '盈利能力',
    'wallet.institution': '机构',

    // Asset classes
    'class.fixedIncome': '固定收益',
    'class.stocks': '股票',
    'class.fiis': 'REITs',
    'class.crypto': '加密货币',
    'class.international': '国际',
    'class.pension': '养老金',

    // Cards
    'cards.title': '卡片',
    'cards.currentInvoice': '当前账单',
    'cards.nextInvoice': '下期账单',
    'cards.spendingByCategory': '按类别支出',
    'cards.transactions': '交易',
    'cards.noCards': '未连接卡片',

    // Categories
    'category.food': '餐饮',
    'category.transport': '交通',
    'category.subscriptions': '订阅',
    'category.shopping': '购物',
    'category.fuel': '燃料',
    'category.health': '健康',
    'category.travel': '旅行',
    'category.tech': '科技',

    // Alerts
    'alerts.title': '提醒',
    'alerts.markAllRead': '全部标记为已读',
    'alerts.all': '全部',
    'alerts.distribution': '分配',
    'alerts.maturity': '到期',
    'alerts.invoice': '账单',
    'alerts.insight': '洞察',
    'alerts.system': '系统',
    'alerts.noNotifications': '没有通知',
    'alerts.dismiss': '忽略',

    // Profile
    'profile.security': '安全',
    'profile.biometric': '生物识别',
    'profile.changePassword': '修改密码',
    'profile.changePin': '修改PIN',
    'profile.preferences': '偏好设置',
    'profile.pushNotifications': '推送通知',
    'profile.hideValuesOnOpen': '打开时隐藏数值',
    'profile.language': '语言',
    'profile.defaultCurrency': '默认货币',
    'profile.connectedAccounts': '已连接账户',
    'profile.connectOpenFinance': '通过Open Finance连接',
    'profile.zurtToken': 'ZURT令牌',
    'profile.tokenBalance': '令牌余额',
    'profile.revenueShare': '收益分享',
    'profile.nextDistribution': '下次分配',
    'profile.about': '关于',
    'profile.terms': '使用条款',
    'profile.privacy': '隐私政策',
    'profile.help': '帮助',
    'profile.support': '支持',
    'profile.logout': '退出',
    'profile.logoutConfirm': '确定要退出吗？',
    'profile.cancel': '取消',
    'profile.demoMode': '演示模式',
    'profile.demoUnavailable': '演示模式不可用',

    // Connection status
    'status.connected': '已连接',
    'status.syncing': '同步中...',
    'status.error': '连接错误',

    // Connect bank
    'connect.title': '连接机构',
    'connect.search': '搜索机构...',
    'connect.connecting': '连接中...',
    'connect.success': '连接成功！',
    'connect.error': '连接错误',

    // Change password
    'password.title': '修改密码',
    'password.current': '当前密码',
    'password.new': '新密码',
    'password.confirm': '确认密码',
    'password.save': '保存',
    'password.success': '密码修改成功！',
    'password.error': '修改密码错误',
    'password.mismatch': '密码不匹配',

    // Common
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.retry': '重试',
    'common.close': '关闭',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.ok': '确定',

    // Languages
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.zh': '中文',
    'lang.ar': 'العربية',

    // Currencies
    'currency.BRL': 'BRL (R$)',
    'currency.USD': 'USD ($)',
    'currency.EUR': 'EUR (€)',
  },
  ar: {
    // Tabs
    'tab.home': 'الرئيسية',
    'tab.wallet': 'المحفظة',
    'tab.cards': 'البطاقات',
    'tab.alerts': 'التنبيهات',
    'tab.profile': 'الملف الشخصي',

    // Home
    'home.totalPatrimony': 'إجمالي الأصول',
    'home.invested': 'المستثمر',
    'home.profit': 'الربح',
    'home.evolution': 'تطور الأصول',
    'home.allocation': 'التوزيع حسب الفئة',
    'home.connectedAccounts': 'الحسابات المتصلة',
    'home.connectInstitution': '+ ربط مؤسسة',
    'home.insights': 'رؤى',
    'home.viewDetails': 'عرض التفاصيل',
    'home.showValues': 'إظهار القيم',
    'home.hideValues': 'إخفاء القيم',
    'home.notifications': 'الإشعارات',
    'home.unread': 'غير مقروءة',

    // Greetings
    'greeting.morning': 'صباح الخير',
    'greeting.afternoon': 'مساء الخير',
    'greeting.evening': 'مساء الخير',

    // Wallet
    'wallet.title': 'المحفظة',
    'wallet.byClass': 'حسب الفئة',
    'wallet.byInstitution': 'حسب المؤسسة',
    'wallet.asset': 'أصل',
    'wallet.assets': 'أصول',
    'wallet.avgPrice': 'متوسط السعر',
    'wallet.currentPrice': 'السعر الحالي',
    'wallet.quantity': 'الكمية',
    'wallet.investedValue': 'القيمة المستثمرة',
    'wallet.currentValue': 'القيمة الحالية',
    'wallet.profitability': 'الربحية',
    'wallet.institution': 'المؤسسة',

    // Asset classes
    'class.fixedIncome': 'الدخل الثابت',
    'class.stocks': 'الأسهم',
    'class.fiis': 'صناديق الاستثمار العقاري',
    'class.crypto': 'العملات الرقمية',
    'class.international': 'دولي',
    'class.pension': 'التقاعد',

    // Cards
    'cards.title': 'البطاقات',
    'cards.currentInvoice': 'الفاتورة الحالية',
    'cards.nextInvoice': 'الفاتورة القادمة',
    'cards.spendingByCategory': 'الإنفاق حسب الفئة',
    'cards.transactions': 'المعاملات',
    'cards.noCards': 'لا توجد بطاقات متصلة',

    // Categories
    'category.food': 'الطعام',
    'category.transport': 'النقل',
    'category.subscriptions': 'الاشتراكات',
    'category.shopping': 'التسوق',
    'category.fuel': 'الوقود',
    'category.health': 'الصحة',
    'category.travel': 'السفر',
    'category.tech': 'التكنولوجيا',

    // Alerts
    'alerts.title': 'التنبيهات',
    'alerts.markAllRead': 'تعيين الكل كمقروء',
    'alerts.all': 'الكل',
    'alerts.distribution': 'التوزيع',
    'alerts.maturity': 'الاستحقاق',
    'alerts.invoice': 'الفاتورة',
    'alerts.insight': 'رؤية',
    'alerts.system': 'النظام',
    'alerts.noNotifications': 'لا توجد إشعارات',
    'alerts.dismiss': 'تجاهل',

    // Profile
    'profile.security': 'الأمان',
    'profile.biometric': 'القياسات الحيوية',
    'profile.changePassword': 'تغيير كلمة المرور',
    'profile.changePin': 'تغيير رمز PIN',
    'profile.preferences': 'التفضيلات',
    'profile.pushNotifications': 'إشعارات الدفع',
    'profile.hideValuesOnOpen': 'إخفاء القيم عند الفتح',
    'profile.language': 'اللغة',
    'profile.defaultCurrency': 'العملة الافتراضية',
    'profile.connectedAccounts': 'الحسابات المتصلة',
    'profile.connectOpenFinance': 'الاتصال عبر Open Finance',
    'profile.zurtToken': 'رمز ZURT',
    'profile.tokenBalance': 'رصيد الرموز',
    'profile.revenueShare': 'حصة الإيرادات',
    'profile.nextDistribution': 'التوزيع القادم',
    'profile.about': 'حول',
    'profile.terms': 'شروط الاستخدام',
    'profile.privacy': 'سياسة الخصوصية',
    'profile.help': 'مساعدة',
    'profile.support': 'الدعم',
    'profile.logout': 'تسجيل الخروج',
    'profile.logoutConfirm': 'هل تريد تسجيل الخروج فعلاً؟',
    'profile.cancel': 'إلغاء',
    'profile.demoMode': 'الوضع التجريبي',
    'profile.demoUnavailable': 'غير متاح في الوضع التجريبي',

    // Connection status
    'status.connected': 'متصل',
    'status.syncing': 'جارٍ المزامنة...',
    'status.error': 'خطأ في الاتصال',

    // Connect bank
    'connect.title': 'ربط مؤسسة',
    'connect.search': 'بحث عن مؤسسة...',
    'connect.connecting': 'جارٍ الاتصال...',
    'connect.success': 'تم الاتصال بنجاح!',
    'connect.error': 'خطأ في الاتصال',

    // Change password
    'password.title': 'تغيير كلمة المرور',
    'password.current': 'كلمة المرور الحالية',
    'password.new': 'كلمة المرور الجديدة',
    'password.confirm': 'تأكيد كلمة المرور',
    'password.save': 'حفظ',
    'password.success': 'تم تغيير كلمة المرور بنجاح!',
    'password.error': 'خطأ في تغيير كلمة المرور',
    'password.mismatch': 'كلمات المرور غير متطابقة',

    // Common
    'common.loading': 'جارٍ التحميل...',
    'common.error': 'خطأ',
    'common.retry': 'إعادة المحاولة',
    'common.close': 'إغلاق',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.ok': 'موافق',

    // Languages
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.zh': '中文',
    'lang.ar': 'العربية',

    // Currencies
    'currency.BRL': 'BRL (R$)',
    'currency.USD': 'USD ($)',
    'currency.EUR': 'EUR (€)',
  },
};
