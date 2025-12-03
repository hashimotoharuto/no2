import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHn6yUsThho9mRF2wsBONJgq-2DEPX30Y",
  authDomain: "todoapp-e28f1.firebaseapp.com",
  projectId: "todoapp-e28f1",
  storageBucket: "todoapp-e28f1.firebasestorage.app",
  messagingSenderId: "246079628292",
  appId: "1:246079628292:web:89a1b1a4b8d10514c4c151",
  measurementId: "G-N9WWWYL65Z"
};



// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null; // 現在ログインしているユーザー情報

//ログイン機能
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

// ログイン処理
loginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("ログイン成功:", result.user.displayName);
        }).catch((error) => {
            console.error("ログインエラー:", error);
        });
});


// ログアウト処理
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        alert("ログアウトしました");
        location.reload(); // 画面リロードして表示をクリア
    });
});

// ログイン状態の監視（ページを開いた時に自動でチェック）
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログインしている時
        currentUser = user;
        loginBtn.style.display = 'none';
        userInfo.style.display = 'block';
        userName.textContent = user.displayName + " さん";
        
        // ★データベースからタスクを読み込む
        loadTasksFromDB();
    } else {
        // ログアウトしている時
        currentUser = null;
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        // タスクリストを空にするなどの処理が必要ならここに書く
    }
});

// HTMLのonclickで呼べるように window オブジェクトに紐付ける
window.openModal = openModal;
window.changeProgress = changeProgress;
window.toggleNotification = toggleNotification;
window.saveEmail = saveEmail;



// どのカラムのボタンが押されたかを記録する変数
let currentColumn = null;

// ダイアログ要素を取得
const dialog = document.getElementById('taskDialog');
const inputTitle = document.getElementById('inputTitle');
const inputDate = document.getElementById('inputDate');
const confirmBtn = document.getElementById('confirmBtn');
//キャンセルボタンの取得
const cancelBtn = document.getElementById('cancelBtn');



function openModal(btnElement) {
    if (!currentUser) {
        alert("タスクを追加するにはログインしてください。");
        return;
    }
    currentColumn = btnElement.closest('.column');
    inputTitle.value = '';
    inputDate.value = '';
    dialog.showModal();
}

cancelBtn.addEventListener('click', () => {
    dialog.close();
});

// 「追加」ボタンが押されたとき（データベース保存）
confirmBtn.addEventListener('click', async () => {
    const title = inputTitle.value;
    const date = inputDate.value;

    if (!title || !date) {
        alert("タイトルと期日を入力してください");
        return;
    }

    // どのカラムに追加するかIDで判定
    let columnId = currentColumn.id; // "col-urgent" など

    try {
        // ★Firestoreにデータを保存
        const docRef = await addDoc(collection(db, "tasks"), {
            uid: currentUser.uid,    // 誰のタスクか
            title: title,
            date: date,
            columnId: columnId,      // どの列にあるか
            createdAt: new Date()
        });
        
        console.log("タスク保存完了 ID: ", docRef.id);

        // 画面にも追加（IDを渡す）
        addTaskToHTML(columnId, title, date, docRef.id);
        
        dialog.close();
    } catch (e) {
        console.error("エラー:", e);
        alert("保存に失敗しました");
    }
});

// データベースから読み込んで画面に表示する関数
async function loadTasksFromDB() {
    // 自分のタスクだけを取得
    const q = query(collection(db, "tasks"), where("uid", "==", currentUser.uid));
    
    // リアルタイム同期（DBが変わると画面も勝手に変わる）
    onSnapshot(q, (snapshot) => {
        // 一旦リストをクリアするのは大変なので、簡易的に「読み込み直す」実装例
        // ※本来は変更差分だけ更新しますが、今回はシンプルに全消し＆再描画します
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');

        snapshot.forEach((doc) => {
            const data = doc.data();
            addTaskToHTML(data.columnId, data.title, data.date, doc.id);
        });
        
        // 通知チェック機能もここで呼ぶと良い
        if(localStorage.getItem('isNotifyOn') === 'true'){
            checkAndSendNotification(); 
        }
    });
}

// 画面にカードを追加する関数（DB保存はしない、表示のみ）
function addTaskToHTML(columnId, title, date, docId) {
    const columnElement = document.getElementById(columnId);
    if (!columnElement) return;
    
    const taskList = columnElement.querySelector('.task-list');

    // data-id属性にDBのドキュメントIDを持たせておく（削除用）
    const newCardHTML = `
        <div class="card" data-date="${date}" data-id="${docId}">
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

// 進捗変更・削除処理
async function changeProgress(clickedElement, level) {
    const parent = clickedElement.parentElement;
    const steps = parent.querySelectorAll('.step');

    steps.forEach((step, index) => {
        if (index + 1 <= level) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // レベル4（完了）になったら削除
    if (level === 4) {
        const card = clickedElement.closest('.card');
        const docId = card.getAttribute('data-id'); // HTMLからIDを取得

        if (confirm("タスクを完了して削除しますか？")) {
            try {
                // ★Firestoreから削除
                await deleteDoc(doc(db, "tasks", docId));
                console.log("DBから削除しました");
                
                // 画面のアニメーション
                card.classList.add('fade-out');
                setTimeout(() => { card.remove(); }, 500);
            } catch (e) {
                console.error("削除エラー", e);
                alert("削除に失敗しました");
            }
        }
    }
}

// ▼▼▼ 4. 通知機能（元のコードを維持） ▼▼▼
const notifyToggle = document.getElementById('notifyToggle');
const emailBox = document.getElementById('emailBox');
const notifyEmail = document.getElementById('notifyEmail');

window.addEventListener('load', () => {
    const isNotifyOn = localStorage.getItem('isNotifyOn') === 'true';
    const savedEmail = localStorage.getItem('notifyEmail');
    if(notifyToggle) notifyToggle.checked = isNotifyOn;
    if (savedEmail && notifyEmail) notifyEmail.value = savedEmail;
    toggleNotificationUI(isNotifyOn);
});

function toggleNotification() {
    const isOn = notifyToggle.checked;
    localStorage.setItem('isNotifyOn', isOn);
    toggleNotificationUI(isOn);
    if (isOn) {
        alert("通知をONにしました。");
        checkAndSendNotification();
    }
}

function toggleNotificationUI(isOn) {
    if(!emailBox) return;
    emailBox.style.display = isOn ? 'block' : 'none';
}

function saveEmail() {
    localStorage.setItem('notifyEmail', notifyEmail.value);
}

function checkAndSendNotification() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayString = `${yyyy}-${mm}-${dd}`;

    const allCards = document.querySelectorAll('.card');
    let dueTasks = [];

    allCards.forEach(card => {
        const cardDate = card.getAttribute('data-date');
        const cardTitle = card.querySelector('.card-title').innerText;
        if (cardDate === todayString) {
            dueTasks.push(cardTitle);
        }
    });

    const email = notifyEmail ? notifyEmail.value : "";
    
    // 通知済みフラグなどを管理しないとリロードのたびに出るので注意
    // ここでは簡易的にコンソールのみ
    if (dueTasks.length > 0 && email) {
        console.log(`今日のタスクがあります: ${dueTasks.join(',')}`);
    }
}