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

// 監視解除用の関数を入れておく変数（重複防止用）
let unsubscribe = null;

// --- ログイン・ログアウト機能 ---
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

// ログイン処理
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then((result) => {
                console.log("ログイン成功:", result.user.displayName);
            }).catch((error) => {
                console.error("ログインエラー:", error);
            });
    });
}

// ログアウト処理
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert("ログアウトしました");
            location.reload(); 
        });
    });
}

// ログイン状態の監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログイン時
        currentUser = user;
        if(loginBtn) loginBtn.style.display = 'none';
        if(userInfo) userInfo.style.display = 'block';
        if(userName) userName.textContent = user.displayName + " さん";
        
        // データベースからタスクを読み込む
        loadTasksFromDB();
    } else {
        // ログアウト時
        currentUser = null;
        if(loginBtn) loginBtn.style.display = 'block';
        if(userInfo) userInfo.style.display = 'none';
        
        // 監視を解除してリストを空にする
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
    }
});

// HTMLから呼べるようにwindowに紐付け
window.openModal = openModal;
window.changeProgress = changeProgress;
window.toggleNotification = toggleNotification;
window.saveEmail = saveEmail;

// --- 変数定義 ---
let currentColumn = null;
const dialog = document.getElementById('taskDialog');
const inputTitle = document.getElementById('inputTitle');
const inputDate = document.getElementById('inputDate');
const confirmBtn = document.getElementById('confirmBtn');
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

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        dialog.close();
    });
}

// 「追加」ボタン処理
if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
        const title = inputTitle.value;
        const date = inputDate.value;

        if (!title || !date) {
            alert("タイトルと期日を入力してください");
            return;
        }

        let columnId = currentColumn.id; 

        try {
            // Firestoreに保存（画面への追加はonSnapshotに任せる）
            const docRef = await addDoc(collection(db, "tasks"), {
                uid: currentUser.uid,
                title: title,
                date: date,
                columnId: columnId,
                createdAt: new Date()
            });
            console.log("タスク保存完了 ID: ", docRef.id);
            dialog.close();
        } catch (e) {
            console.error("エラー:", e);
            alert("保存に失敗しました");
        }
    });
}

// データベースから読み込み（重複防止版）
async function loadTasksFromDB() {
    // すでに監視中なら、いったん解除する（これが重要！）
    if (unsubscribe) {
        unsubscribe();
    }

    const q = query(collection(db, "tasks"), where("uid", "==", currentUser.uid));
    
    // リアルタイム同期を開始し、解除関数を変数に保存
    unsubscribe = onSnapshot(q, (snapshot) => {
        // リストを全クリア
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');

        snapshot.forEach((doc) => {
            const data = doc.data();
            addTaskToHTML(data.columnId, data.title, data.date, doc.id);
        });
        
        // 通知チェック
        if(localStorage.getItem('isNotifyOn') === 'true'){
            checkAndSendNotification(); 
        }
    });
}

// 画面表示用関数
function addTaskToHTML(columnId, title, date, docId) {
    const columnElement = document.getElementById(columnId);
    if (!columnElement) return;
    
    const taskList = columnElement.querySelector('.task-list');

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

// 進捗・削除処理
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

    if (level === 4) {
        const card = clickedElement.closest('.card');
        const docId = card.getAttribute('data-id');

        if (confirm("タスクを完了して削除しますか？")) {
            try {
                await deleteDoc(doc(db, "tasks", docId));
                console.log("DBから削除しました");
                // 削除のアニメーション等はonSnapshotで画面更新されるのでそのままでも消えますが、
                // 即時フィードバックとしてCSSアニメーションだけ適用してもOK
            } catch (e) {
                console.error("削除エラー", e);
                alert("削除に失敗しました");
            }
        }
    }
}

// --- 通知機能 ---
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
    const isOn = notifyToggle ? notifyToggle.checked : false;
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
    if(notifyEmail) localStorage.setItem('notifyEmail', notifyEmail.value);
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
    if (dueTasks.length > 0 && email) {
        console.log(`今日のタスクがあります: ${dueTasks.join(',')}`);
    }
}