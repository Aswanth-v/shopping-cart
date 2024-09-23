const bcrypt = require('bcrypt');
const db = require('../config/connection');
const collection = require('../config/collections');
const { response } = require('express');
const { Collection } = require('mongoose');
var ObjectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay');
const { resolve } = require('node:path');
var instance = new Razorpay({
  key_id: 'rzp_test_4Ojd1pa4XL0RPh',
  key_secret: 'nJrTIWaygNa1HMrfLVJ1rsgf',
});

module.exports = {
  doSignup: async (userData) => {
    try {
      console.log('Received userData:', userData);

      if (!userData.password) {
        throw new Error('Password is required');
      }

      // Hash the password
      userData.password = await bcrypt.hash(userData.password, 10);

      // Insert user data into the database
      const database = db.getDB();  // Ensure db is initialized
      if (!database) {
        throw new Error("Database not initialized");
      }

      const data = await database.collection(collection.USER_COLLECTION).insertOne(userData);

      // Resolve with the inserted ID
      return data.insertedId;

    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      try {
        const database = db.getDB();  // Ensure db is initialized
        if (!database) {
          throw new Error("Database not initialized");
        }

        let user = await database.collection(collection.USER_COLLECTION).findOne({ email: userData.email });

        if (user) {
          bcrypt.compare(userData.password, user.password).then((status) => {
            if (status) {
              console.log("Login successful");
              response.user = user;
              response.status = true;
              resolve(response);
            } else {
              console.log("Login failed: Incorrect password");
              resolve({ status: false, message: "Incorrect password" });
            }
          }).catch((err) => {
            console.error("Error comparing passwords", err);
            reject(err);
          });
        } else {
          console.log('Login failed: User not found');
          resolve({ status: false, message: "User not found" });
        }
      } catch (err) {
        console.error("Error during login process", err);
        reject(err);
      }
    });
  },

  addToCart: (proId, userId) => {
    let proObj={
      item: new ObjectId(proId),
      quantity:1
    }
    return new Promise(async (resolve, reject) => {
      const database = db.getDB();  // Ensure db is initialized
      if (!database) {
        throw new Error("Database not initialized");
      }

      let userCart = await database.collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

      if (userCart) {
        let proExit=userCart.products.findIndex(product=>product.item==proId)
        console.log(proExit);
        if(proExit!=-1){
          db.getDB().collection(collection.CART_COLLECTION)
          .updateOne({user:new ObjectId(userId),'products.item':new ObjectId(proId)},
          {
            $inc:{'products.$.quantity':+1}
          }
        ).then(()=>{
          resolve()
        })
        }else{
       db.getDB().collection(collection.CART_COLLECTION)
       .updateOne({user: new ObjectId(userId)},
       {

           $push:{products:proObj}
      }

    
     ).then((response)=>{
       resolve()
     })
    }
      } else {
        let cartObj = {
          user: new ObjectId(userId),
          products: [proObj],
        };
        database.collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      }
    });
  },
  getCartProducts:(userId)=>{
    return new Promise(async(resolve,reject)=>{
     let cartItems=await db.getDB().collection(collection.CART_COLLECTION).aggregate([
      {
      $match:{user:new ObjectId(userId)}
      },
      {
        $unwind:'$products'
      },
      {
        $project:{
          item:"$products.item",
          quantity:'$products.quantity'
        }
      },
      {
        $lookup:{
          from:collection.PRODUCT_COLLECTION,
          localField:'item',
          foreignField:'_id',
          as:'product'
        }
      },
      {
        $project:{
          item:1,
          quantity:1,
          product:{$arrayElemAt:['$product',0]}
        }
      }

   
     ]).toArray()
     
     
     resolve(cartItems)
    })
},
getCartcount:(userId)=>{
  return new Promise(async(resolve,reject)=>{
    let count=0
    let cart=await db.getDB().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
    if(cart){
      count=cart.products.length
    }
    resolve(count)
  })
},
changeProductQuantity: (details) => {
  // Convert count and quantity to integers
  details.count = parseInt(details.count);
  details.quantity = parseInt(details.quantity);

  return new Promise((resolve, reject) => {
    // Case where the product should be removed from the cart
    if (details.count ==-1 && details.quantity == 1) {
      db.getDB()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: new ObjectId(details.cart) },
          { $pull: { products: { item: new ObjectId(details.product) } } }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      // Update the product quantity
      db.getDB()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(details.cart),
            "products.item": new ObjectId(details.product), // Ensure matching array element
          },
          {
            $inc: { "products.$.quantity": details.count }, // Use positional operator
          }
        )
        .then((response) => {
          resolve({status:true});
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
},
getTotalAmount: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let total = await db.getDB().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new ObjectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: "$products.item",
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.PRICE' }] } }
          }
        }
      ]).toArray();
      
      // Check if total array is not empty
      if (total.length > 0 && total[0].total !== undefined) {
        console.log(total[0].total);
        resolve(total[0].total);
      } else {
        console.log('Total is undefined or empty array');
        resolve(0);  // Or handle it as per your requirement
      }
    } catch (error) {
      console.error('Error in getTotalAmount:', error);
      reject(error);
    }
  });
},
placeOrder:(order,products,total)=>{
  return new Promise((resolve,reject)=>{
    console.log(order,products,total);
    let status=order['payment-method']==='COD'?'placed':'pending'
    let orderObj={
      deliveryDetails:{
        Mobile:order.Mobile,
        Address:order.Address,
        Pincode:order.Pincode
      },
      userId:new ObjectId(order.userId),
      paymentMethod:order['payment-method'],
      products:products,
      totalAmount:total,
      status:status,
      date:new Date()
    }
    
    db.getDB().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
      db.getDB().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) })
      .then((deleteResponse) => {
        console.log('Delete response:', deleteResponse);
        if (deleteResponse.deletedCount > 0) {
          console.log('Cart data removed successfully');
        
          
          resolve(response.insertedId);
        } else {
          console.log('No matching cart data found for this user:', order.userId);
          reject('No matching cart data found');
        }
      })
      .catch((error) => {
        console.error('Error deleting cart data:', error);
        reject(error.message);
      });
    
 
      
      })
  })

},



getCartProductList :(userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch the cart from the database using the user's ID
      let cart = await db.getDB().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

      // Check if the cart exists and has the products property
      if (cart && cart.products) {
        resolve(cart.products); // Resolve with the products if cart exists
      } else {
        // If the cart does not exist or has no products, handle accordingly
        resolve([]); // Resolve with an empty array if no products are found
        // Alternatively, you can reject with an error message
        // reject(new Error('Cart not found or is empty.'));
      }
    } catch (error) {
      // Handle any errors that occur during the database operation
      reject(error);
    }
  });


},

getUserOrders:(userId)=>{
  return new Promise(async(resolve,reject)=>{
    console.log(userId);
    let orders=await db.getDB().collection(collection.ORDER_COLLECTION)
    .find({userId:new ObjectId(userId)}).toArray()
    console.log(orders);

    resolve(orders)
    
    
  })
},
getOrderProducts:(orderId)=>{
  return new Promise(async(resolve,reject)=>{
    let orderItems=await db.getDB().collection(collection.ORDER_COLLECTION).aggregate([
     {
     $match:{_id:new ObjectId(orderId)}
     },
     {
       $unwind:'$products'
     },
     {
       $project:{
         item:"$products.item",
         quantity:'$products.quantity'
       }
     },
     {
       $lookup:{
         from:collection.PRODUCT_COLLECTION,
         localField:'item',
         foreignField:'_id',
         as:'product'
       }
     },
     {
       $project:{
         item:1,
         quantity:1,
         product:{$arrayElemAt:['$product',0]}
       }
     }

  
    ]).toArray()
    console.log(orderItems);
    
    
    resolve(orderItems)
   })
},
genarateRazorpay:(orderId, total) => {
  console.log(orderId);
  
  return new Promise((resolve, reject) => {
    instance.orders.create(
      {
        amount: total*100,  // Razorpay accepts amount in paise (for INR)
        currency: "INR",
        receipt: orderId,
        notes: {
          key1: "value3",
          key2: "value2",
        },
      },
      (err, order) => {
        if (err) {
          console.error('Error creating order:', err);
          reject(err);
        } else {
          console.log('New order created:', order);
          resolve(order);
        }
      }
    );
  });
},
verifyPayment: (details) => {
  return new Promise((resolve, reject) => {
    const { createHmac } = require('node:crypto');
    const hmac = createHmac('sha256', 'nJrTIWaygNa1HMrfLVJ1rsgf');  // `hmac` is constant

    hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);

    const generatedSignature = hmac.digest('hex');  // Store the result of digest in a new variable
    if (generatedSignature === details['payment[razorpay_signature]']) {
      resolve();
    } else {
      reject(new Error('Payment verification failed.'));
    }
  });
},

changePaymentStatus:(orderId)=>{
  return new Promise((resolve,reject)=>{
    db.getDB().collection(collection.ORDER_COLLECTION)
    .updateOne({_id:new ObjectId(orderId)},
  {
    $set:{
      status:'placed'
    }
  }
  ).then(()=>{
    resolve()
  })
  })
}
}
