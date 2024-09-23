function addToCart(proId){
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html();  // Correct variable name
                count = parseInt(count) + 1;  // Convert the count to an integer and increment it
                $('#cart-count').html(count);  // Update the cart count in the DOM
            }
            alert(response.message || 'Item added to cart successfully!');
        },
        error: (err) => {
            alert('Error adding item to cart');
        }
    });
}
