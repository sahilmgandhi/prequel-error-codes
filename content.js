// Sahil Gandhi


// var images = document.getElementsByTagName('img');
// for (var i = 0, l = images.length; i < l; i++) {
//   images[i].src = 'http://placekitten.com/' + images[i].width + '/' + images[i].height;
// }

var url = window.location.href;

var xhr = new XMLHttpRequest();
xhr.open('GET', url, true);
xhr.send();

xhr.onreadystatechange = processRequest;

var wrapper = document.createElement("div");

var innerHTML = `<div class="modal">
<div class="modal-content">
    <span class="close-button">×</span>`;

var modal;
var closeButton;

function processRequest(e) {
  if (xhr.readyState == 4) {

    let currStatus = xhr.status;

    console.log("The status is: " + currStatus);

    switch (currStatus) {
      case 404:
        innerHTML += `<h1>404 Error</h1>`;
        innerHTML += `<img src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/rawErrorCodes.png?raw=true" alt="404 Image" height="200" width="200">`;
        break;

      default:
        return;
    }

    innerHTML += `</div> </div>`;
    wrapper.innerHTML = innerHTML;

    // Show the modal
    document.body.appendChild(wrapper);
    modal = document.querySelector(".modal");
    modal.classList.toggle("show-modal");

    closeButton = document.querySelector(".close-button");
    closeButton.addEventListener("click", toggleModal);
  }
}

function toggleModal() {
  modal.classList.toggle("show-modal");
}