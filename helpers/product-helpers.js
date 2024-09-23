const { response } = require('../app');
var collection = require('../config/collections');
const { getDB } = require('../config/connection');
var ObjectId = require('mongodb').ObjectId

module.exports = {
    addProduct: (product, callback) => {
        const db = getDB(); // Get the connected database instance
        db.collection('product').insertOne(product).then((data) => {
            callback(null, data.insertedId);
        }).catch((err) => {
            console.error(err);
            callback(err);
        });
    },

    getAllProducts: async () => {
        try {
            const db = getDB(); // Get the connected database instance
            if (!db) {
                throw new Error("Database connection is not established.");
            }
            let products = await db.collection(collection.PRODUCT_COLLECTION).find().toArray();
            return products;
        } catch (error) {
            console.error("Error occurred:", error);
            throw new Error("Failed to retrieve products: " + error.message);
        }
    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            const db = getDB();
    
            // Log the proId to check its format
            console.log("Product ID:", proId);
    
            if (!ObjectId.isValid(proId)) {
                return reject(new Error("Invalid product ID"));
            }
    
            db.collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) })
                .then((response) => {
                    if (response.deletedCount === 0) {
                        return reject(new Error("No product found with the given ID"));
                    }
                    resolve(response);   
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        });
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            const db=getDB()
            db.collection(collection.PRODUCT_COLLECTION).findOne({_id: new ObjectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            const db=getDB()
            db.collection(collection.PRODUCT_COLLECTION).updateOne({_id: new ObjectId(proId)},{
                $set:{
                    NAME:proDetails.NAME,
                    DESCRIPTION:proDetails.DESCRIPTION,
                    CATEGORY:proDetails.CATEGORY
                }
            }).then((response)=>{

            resolve()
            })
        })
    }
}