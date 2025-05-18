const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // ضع مسار ملف الخدمة الخاص بك

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addSubcollectionsFieldToAllCollections() {
  // جلب كل الكوليكشنات من الجذر
  const collections = await db.listCollections();

  for (const collection of collections) {
    const collectionName = collection.id;
    const snapshot = await db.collection(collectionName).get();

    for (const doc of snapshot.docs) {
      // جلب أسماء السب-كوليكشنات لهذا الدوكمنت
      const subcollections = await doc.ref.listCollections();
      const subNames = subcollections.map((sub) => sub.id);

      // تحديث الدوكمنت بحقل subcollections
      await doc.ref.set({ subcollections: subNames }, { merge: true });
      console.log(
        `✅ Updated ${collectionName}/${doc.id} with subcollections:`,
        subNames
      );
    }
  }
}

async function addDummyFieldToEmptyDocs() {
  const collections = await db.listCollections();

  for (const collection of collections) {
    const collectionName = collection.id;
    const snapshot = await db.collection(collectionName).get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data || Object.keys(data).length === 0) {
        await doc.ref.set({ dummy: true }, { merge: true });
        console.log(`🟡 Added dummy to ${collectionName}/${doc.id}`);
      }
    }
  }
}

addSubcollectionsFieldToAllCollections().catch(console.error);
addDummyFieldToEmptyDocs().catch(console.error);
