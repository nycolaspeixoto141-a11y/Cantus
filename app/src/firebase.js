import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHqVG230CXXx_xLxVm_4oUq6ZB-BHv3e0",
  authDomain: "ministerio-musica-9f892.firebaseapp.com",
  projectId: "ministerio-musica-9f892",
  storageBucket: "ministerio-musica-9f892.firebasestorage.app",
  messagingSenderId: "1032491585575",
  appId: "1:1032491585575:web:d846d47297460d70e23e02"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
transposicao: 0