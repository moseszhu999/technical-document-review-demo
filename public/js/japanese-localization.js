(() => {
    const exact = new Map(Object.entries({
        'WORKSHOP DIGITAL TWIN': '製造現場デジタルツイン',
        'ASSET REVIEW': '設備レビュー',
        'EVENT / EVIDENCE TIMELINE': 'イベント／エビデンス・タイムライン',
        'HUMAN CONFIRMATION': '人手による最終確認',
        'review trace': 'レビュー履歴',
        'final responsibility': '最終判断責任',
        'Decision': '最終判断',
        'Pending Evidence': '根拠確認待ち',
        'CONFIRM': '確認',
        'ESCALATE': 'エスカレーション',
        'PENDING EVIDENCE': '根拠確認待ち',
        'Assets': '設備',
        'Review Required': '要確認',
        'In Review': 'レビュー中',
        'Confirmed': '確認済み',
        'Evidence Gaps': '根拠不足',
        'Available': '確認可能',
        'No Recent Activity': '最近の更新なし',
        'AVAILABLE': '確認可能',
        'IN REVIEW': 'レビュー中',
        'REVIEW REQUIRED': '要確認',
        'CONFIRMED': '確認済み',
        'IDLE': '待機中',
        'LIVE 3D TWIN': '3Dデジタルツイン',
        'drag: orbit · wheel: zoom · click: asset': 'ドラッグ：回転 · ホイール：拡大縮小 · クリック：設備',
        'OVERVIEW': '全体表示',
        'FOCUS': '選択設備へ',
        'AUTO ORBIT': '自動回転',
        '3D WORKSHOP INITIALIZING': '3D車間を読み込み中',
        'Zone': 'エリア',
        'Owner': '担当',
        'Product': '製品',
        'Linked entity': '関連対象',
        'Linked Documents': '関連文書',
        'Evidence Topics': 'エビデンス項目',
        'Rule Results': 'ルール判定',
        'REFERENCE': '参照',
        'PASS': '適合',
        'REVIEW': '要確認',
        'V1 boundary:': 'V1の範囲：',
        'DIGITAL TWIN / EVIDENCE REVIEW / PUBLIC DEMO': 'デジタルツイン / エビデンスレビュー / 公開デモ',
        'DEMO REVIEW RECORD': 'デモ用レビュー記録',
        'NORD · OFFICIAL PUBLIC SOURCE': 'NORD · 公式公開資料',
        'REAL PUBLIC SOURCE': '公式公開資料',
        'Publisher': '発行元',
        'Product scope': '対象製品',
        'Languages': '言語',
        'Role in review': 'レビューでの役割',
        'Source ID': '出典ID',
        'Verified': '確認日',
        'Receiving': '受入区',
        'Assembly Line': '組立区',
        'Parts Storage': '部品保管区',
        'Inspection': '検査区',
        'Maintenance': '保全区',
        'Shipping': '出荷区',
        'Receiving / 受入区': '受入区',
        'Assembly Line / 装配区': '組立区',
        'Parts Storage / 备件区': '部品保管区',
        'Inspection / 检验区': '検査区',
        'Maintenance / 保全区': '保全区',
        'Shipping / 出货区': '出荷区',
        'MAXXDRIVE Review Workshop': 'MAXXDRIVE レビュー車間',
        'Incoming Gear Unit': '入荷減速機',
        'Spare Parts Rack': 'スペアパーツ棚',
        'Gearbox Assembly Line': '減速機組立ライン',
        'Bearing Fit Station': 'ベアリング組付け工程',
        'Ratio Inspection Bench': '減速比検査台',
        'Final QC Station': '最終品質検査工程',
        'Maintenance Workbench': '保全作業台',
        'Outbound Review Desk': '出荷前レビュー工程',
        'Incoming Quality': '受入品質担当',
        'Parts Control': '部品管理担当',
        'Assembly Lead': '組立責任者',
        'Assembly Engineer': '組立エンジニア',
        'Quality Engineer': '品質エンジニア',
        'Final Quality': '最終品質担当',
        'Maintenance Engineer': '保全エンジニア',
        'Delivery Reviewer': '出荷レビュー担当',
        'Incoming acceptance': '受入確認',
        'Revision identity': '改訂番号の一致',
        'Parts structure': '部品構成',
        'Component reference': '部品参照',
        'Drawing revision': '図面改訂',
        'Assembly instruction': '組立作業指示',
        'Bearing clearance': 'ベアリングすきま',
        'Parts reference': '部品参照',
        'Gear ratio': '減速比',
        'Measured value': '実測値',
        'Human review': '人手レビュー',
        'Final inspection': '最終検査',
        'Revision consistency': '改訂整合性',
        'Clearance': 'すきま',
        'Maintenance interval': '保全間隔',
        'Inspection cadence': '点検周期',
        'Final evidence pack': '最終エビデンス一式',
        'Human confirmation': '人手確認',
        'Drawing linked': '図面を関連付け',
        'DRAW-042 linked to assembly review': 'DRAW-042 を組立レビューに関連付け',
        'Inspection uploaded': '検査記録を登録',
        'INSP-042 added to evidence chain': 'INSP-042 をエビデンス連鎖に追加',
        'Rule triggered': 'ルール判定を実行',
        'DEMO-R02 requires review': 'DEMO-R02 は人手確認が必要',
        'Evidence located': '根拠位置を特定',
        'Ratio evidence mapped to source position': '減速比の根拠を元文書位置に紐付け',
        'Human review requested': '人手レビューを依頼',
        'INSP-01 escalated for confirmation': 'INSP-01 を最終確認へエスカレーション',
        'Japanese': '日本語',
        'English': '英語',
        'Chinese': '中国語',
        'German': 'ドイツ語',
        'French': 'フランス語',
        'Manual with installation instructions – Industrial gear units': '据付説明付き取扱説明書 ― 産業用ギヤユニット',
        'Catalogue – MAXXDRIVE® industrial gear units 50 Hz Metric, 60 Hz Imperial': 'カタログ ― MAXXDRIVE® 産業用ギヤユニット 50 Hz（メートル法）／60 Hz（ヤード・ポンド法）',
        'Spare parts list – MAXXDRIVE® XC industrial gear units – Standard + options': 'スペアパーツリスト ― MAXXDRIVE® XC 産業用ギヤユニット ― 標準＋オプション',
        'MAXXDRIVE® Industrial Gear Units': 'MAXXDRIVE® 産業用ギヤユニット',
        'MAXXDRIVE® industrial gear units for mixing and agitation processes': '撹拌・混合工程向け MAXXDRIVE® 産業用ギヤユニット',
        'MAXXDRIVE® industrial gear units': 'MAXXDRIVE® 産業用ギヤユニット',
        'MAXXDRIVE® XC industrial gear units': 'MAXXDRIVE® XC 産業用ギヤユニット',
        'MAXXDRIVE® XC Parallel Gear Units / XC Right-Angle Gear Units / XD Parallel Gear Units': 'MAXXDRIVE® XC 平行軸ギヤユニット / XC 直交軸ギヤユニット / XD 平行軸ギヤユニット',
        'mixing and agitation applications using MAXXDRIVE® industrial gear units': 'MAXXDRIVE® 産業用ギヤユニットを使用する混合・撹拌用途',
        'installation, operation and maintenance source': '据付・運転・保全の参照資料',
        'product selection, dimensional and technical catalogue source': '製品選定・寸法・技術仕様の参照カタログ',
        'parts structure and service reference': '部品構成・サービス用の参照資料',
        'product overview and family context': '製品概要・シリーズ全体の参照資料',
        'real-world application context': '実用途の参照資料',
        'Official English B1050 edition 6052902 / 3023 (July 2023).': 'B1050 公式英語版 6052902 / 3023（2023年7月）。',
        'Official English G1050 MAXXDRIVE catalogue. Key-page previews are loaded from NORD\'s PDF server.': 'G1050 MAXXDRIVE 公式英語カタログ。主要ページはNORDのPDFサーバーから直接表示します。',
        'Key-page preview uses the official PL1050_D family spare-parts PDF for SK 11207–SK 11507.': '主要ページのプレビューには、SK 11207～SK 11507向け公式PL1050_Dシリーズ・スペアパーツPDFを使用します。',
        'Inspection and maintenance intervals': '点検・保全間隔',
        'Official B1050 maintenance table covering inspection cadence, operating checks and service references.': '点検周期、運転時確認、保全参照情報をまとめたB1050公式保全表。',
        'Parallel-shaft gear unit dimensional overview': '平行軸ギヤユニット寸法概要',
        'Engineering drawing and dimensional table for solid output shaft, hollow shaft and solid input shaft configurations.': '中実出力軸、中空軸、中実入力軸構成の技術図面と寸法表。',
        'VL6 agitator dimensions': 'VL6撹拌機仕様の寸法',
        'Application-specific dimension table for the VL6 agitator configuration without flange.': 'フランジなしVL6撹拌機構成の用途別寸法表。',
        'Spare parts drawing – SK 11207 / SK 11407': 'スペアパーツ図 ― SK 11207 / SK 11407',
        'Official exploded/parts drawing with numbered component callouts.': '部品番号付きの公式分解図・部品図。',
        'General parts list': '一般部品リスト',
        'Official component-number list corresponding to the spare-parts drawing.': 'スペアパーツ図に対応する公式部品番号一覧。'
    }));

    const phrase = [
        ['OFFICIAL · ', '公式資料 · '],
        ['DEMO · ', 'デモ · '],
        ['PDF page ', 'PDFページ '],
        ['Page ', 'ページ '],
        ['PAGE ', 'ページ '],
    ];

    function translateText(value) {
        if (!value) return value;
        const trimmed = value.trim();
        if (exact.has(trimmed)) {
            const translated = exact.get(trimmed);
            return value.replace(trimmed, translated);
        }
        let next = value;
        for (const [from, to] of exact) {
            if (from.length >= 8 && next.includes(from)) next = next.split(from).join(to);
        }
        for (const [from, to] of phrase) next = next.split(from).join(to);
        next = next.replace(/\bConfirmed ·/g, '確認済み ·')
            .replace(/\bEscalated ·/g, 'エスカレーション済み ·')
            .replace(/\bPending Evidence ·/g, '根拠確認待ち ·');
        return next;
    }

    function translateAttributes(element) {
        for (const attr of ['title', 'aria-label', 'placeholder', 'alt']) {
            const current = element.getAttribute?.(attr);
            if (!current) continue;
            let next = translateText(current);
            next = next
                .replace(/^Interactive 3D workshop digital twin$/, 'インタラクティブ3D車間デジタルツイン')
                .replace(/^(.+) official document preview$/, '$1 公式資料プレビュー')
                .replace(/^(.+) official PDF preview$/, '$1 公式PDFプレビュー');
            if (next !== current) element.setAttribute(attr, next);
        }
    }

    function translateTree(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            const parent = root.parentElement;
            if (parent?.closest('script,style,code,pre')) return;
            const next = translateText(root.nodeValue);
            if (next !== root.nodeValue) root.nodeValue = next;
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
        if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node);
            else if (!node.parentElement?.closest('script,style,code,pre')) {
                const next = translateText(node.nodeValue);
                if (next !== node.nodeValue) node.nodeValue = next;
            }
        }
    }

    const style = document.createElement('style');
    style.textContent = '.twin-map-panel-3d .twin-heading strong:after{content:"3D表示"!important}';
    document.head.appendChild(style);

    translateTree(document.body);
    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'characterData') translateTree(record.target);
            for (const node of record.addedNodes) translateTree(node);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true, characterData: true});
})();
