var express = require('express');
const { render, response } = require('../app');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');


/* GET users listing. */
router.get('/', function(req, res, next) {

  productHelpers.getAllProducts().then((products)=>{
    console.log(products);
    
    res.render('admin/view-products',{admin:true,products})
  })

 
});


router.get('/add-product', function(req, res) {
  res.render('admin/add-product');
});

router.post('/add-product', (req, res) => {
 
  
  productHelpers.addProduct(req.body, (err, insertedId) => {
    if (err) {
      console.error('Failed to add product:', err);
      return res.render('admin/add-product', { error: 'Failed to add product' });
    }
    
    let image = req.files.image;
    image.mv('./public/product-images/' + insertedId + '.jpg', (err) => {
      if (!err) {
        res.render('admin/add-product', { success: 'Product added successfully' });
      } else {
        console.log(err);
        res.render('admin/add-product', { error: 'Failed to upload image' });
      }
    });
  });
});

router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id;
  let id=req.params.id
  console.log("Received Product ID:", proId);
  
  productHelpers.deleteProduct(proId).then((response) => {
      res.redirect('/admin');
  }).catch((error) => {
      console.error(error);
      res.redirect('/admin');
  });
});

router.get('/edit-product/:id',async(req,res)=>{
  let product= await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  
  res.render('admin/edit-product',{product,user:req.session.user})
})
router.post('/edit-product/:id',(req,res)=>{
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){ 
      let image=req.files.image
      image.mv('./public/product-images/' +  req.params.id + '.jpg');
    }
  })
})
module.exports = router;
