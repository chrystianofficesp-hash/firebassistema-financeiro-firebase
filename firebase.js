import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-9amrYq6w6JdHwGw4N4e5oqrVtZPubco",
  authDomain: "financeiro-empresarial.firebaseapp.com",
  projectId: "financeiro-empresarial",
  storageBucket: "financeiro-empresarial.firebasestorage.app",
  messagingSenderId: "403588538971",
  appId: "1:403588538971:web:49280071908ed6c14b157e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.auth = auth;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.getDocs = getDocs;
window.getDoc = getDoc;
window.deleteDoc = deleteDoc;
window.updateDoc = updateDoc;
window.doc = doc;

window.query = query;
window.where = where;

console.log("Firestore conectado!");
console.log("Firebase conectado!");
