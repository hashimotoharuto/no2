// どのカラムのボタンが押されたかを記録する変数
let currentColumn = null;

// ダイアログ要素を取得
const dialog = document.getElementById('taskDialog');
const inputTitle = document.getElementById('inputTitle');
const inputDate = document.getElementById('inputDate');
const confirmBtn = document.getElementById('confirmBtn');

/**
 * モーダルを開く処理
 * @param {HTMLElement} btnElement - 押された＋ボタン
 */
function openModal(btnElement) {
    // どのカラム（急ぎ、今週中...）のボタンかを取得して保存
    currentColumn = btnElement.closest('.column');
    
    // 入力欄をクリア（リセット）
    inputTitle.value = '';
    inputDate.value = '';
    
    // ダイアログを表示
    dialog.showModal();
}

// 「追加」ボタンが押されたときの処理
confirmBtn.addEventListener('click', () => {
    const title = inputTitle.value;
    const date = inputDate.value; // YYYY-MM-DD形式で取得されます

    // 入力チェック（空なら何もしない）
    if (!title || !date) {
        alert("タイトルと期日を入力してください");
        return;
    }

    // タスクを追加
    addTaskToColumn(currentColumn, title, date);

    // ダイアログを閉じる
    dialog.close();
});

/**
 * タスク追加の実処理
 */
function addTaskToColumn(columnElement, title, date) {
    const taskList = columnElement.querySelector('.task-list');

    // HTMLを作成
    // data-date属性に、機械読み取り用の日付(YYYY-MM-DD)を埋め込みます
    // これは将来JavaやAPIに送る時に使います
    const newCardHTML = `
        <div class="card" data-date="${date}">
            <div class="card-title">${title}</div>
            <div class="card-date">📅 ${date}</div>
            <div class="progress-container">
                <div class="progress-label">進捗</div>
                <div class="progress-steps">
                    <div class="step" onclick="changeProgress(this, 1)"></div>
                    <div class="step" onclick="changeProgress(this, 2)"></div>
                    <div class="step" onclick="changeProgress(this, 3)"></div>
                    <div class="step" onclick="changeProgress(this, 4)"></div>
                </div>
            </div>
        </div>
    `;

    taskList.insertAdjacentHTML('beforeend', newCardHTML);
}

/**
 * 進捗バーの処理（前回と同じ）
 */
function changeProgress(clickedElement, level) {
    const parent = clickedElement.parentElement;
    const steps = parent.querySelectorAll('.step');

    steps.forEach((step, index) => {
        if (index + 1 <= level) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    if (level === 4) {
        const card = clickedElement.closest('.card');
        setTimeout(() => {
            card.classList.add('fade-out');
            setTimeout(() => {
                card.remove();
            }, 500);
        }, 300);
    }
}


/* --- 以下、script.jsの一番下に追加 --- */

const notifyToggle = document.getElementById('notifyToggle');
const emailBox = document.getElementById('emailBox');
const notifyEmail = document.getElementById('notifyEmail');

// 画面を開いた時に、保存された設定を読み込む
window.addEventListener('load', () => {
    // ローカルストレージ（ブラウザの保存領域）から読み込み
    const isNotifyOn = localStorage.getItem('isNotifyOn') === 'true';
    const savedEmail = localStorage.getItem('notifyEmail');

    // 状態を復元
    notifyToggle.checked = isNotifyOn;
    if (savedEmail) notifyEmail.value = savedEmail;
    
    // UIの表示切り替え
    toggleNotificationUI(isNotifyOn);

    // もしONなら、今日のタスクをチェックして送信シミュレーションを行う
    if (isNotifyOn) {
        checkAndSendNotification();
    }
});

/**
 * トグルスイッチが押された時の処理
 */
function toggleNotification() {
    const isOn = notifyToggle.checked;
    
    // 設定を保存
    localStorage.setItem('isNotifyOn', isOn);
    
    // UI切り替え
    toggleNotificationUI(isOn);

    if (isOn) {
        alert("通知をONにしました。\n毎日7:00に今日のタスクをメールします（実際には遅れません）");
        checkAndSendNotification(); // テストのためすぐに実行
    }
}

/**
 * UIの表示・非表示制御
 */
function toggleNotificationUI(isOn) {
    if (isOn) {
        emailBox.style.display = 'block';
    } else {
        emailBox.style.display = 'none';
    }
}

/**
 * メールアドレス入力時に保存する
 */
function saveEmail() {
    localStorage.setItem('notifyEmail', notifyEmail.value);
}

/**
 * 【重要】今日のタスクを探して通知するロジック
 * ※本来はJavaサーバーで毎日自動実行する部分です
 */
function checkAndSendNotification() {
    // 1. 今日の日付を「YYYY-MM-DD」形式で取得
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;

    console.log("今日の日付: " + todayString);

    // 2. 画面上のすべてのタスクカードを取得
    const allCards = document.querySelectorAll('.card');
    let dueTasks = [];

    // 3. ループして日付を比較
    allCards.forEach(card => {
        // data-date属性を取得
        const cardDate = card.getAttribute('data-date');
        const cardTitle = card.querySelector('.card-title').innerText;

        // 日付が一致するかチェック
        if (cardDate === todayString) {
            dueTasks.push(cardTitle);
        }
    });

    // 4. もし対象タスクがあれば通知（シミュレーション）
    const email = notifyEmail.value || "未設定";
    
    if (dueTasks.length > 0) {
        // 実際にはここでJavaがメール送信APIを叩きます
        console.log(`【メール送信実行】宛先: ${email}`);
        console.log(`件名: 本日が期日のタスクのお知らせ`);
        console.log(`本文: 以下のタスクが今日までです。\n${dueTasks.join('\n')}`);
        
        // ユーザーに分かりやすくアラート表示
        setTimeout(() => {
            alert(`【システム通知】\n宛先: ${email}\n\n本日(${todayString})が期日のタスクがあります！\n\n・${dueTasks.join('\n・')}`);
        }, 1000); // 1秒後に表示
    }
}