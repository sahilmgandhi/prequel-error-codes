// Sahil Gandhi

var url = window.location.href;
console.log(url);

var xhr = new XMLHttpRequest();
xhr.open('GET', url, true);
xhr.send();

xhr.onreadystatechange = processRequest;

var wrapper = document.createElement("div");

var innerHTML = `<div class="prequel-modal">
<div class="prequel-modal-content">
    <span class="prequel-close-button">×</span>`;

var modal;
var closeButton;

function processRequest(e) {
  if (xhr.readyState == 4) {

    let currStatus = xhr.status;

    console.log("The status is: " + currStatus);

    switch (currStatus) {
      case 308:
        innerHTML += `<h1 align="center">Permanent Redirect - 308 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_308.png?raw=true" alt="308 Image">`;
        break;
      case 400:
        innerHTML += `<h1 align="center">Bad Request - 400 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_400.png?raw=true" alt="400 Image">`;
        break;
      case 403:
        innerHTML += `<h1 align="center">Forbidden - 403 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_403.png?raw=true" alt="403 Image">`;
        break;
      case 404:
        innerHTML += `<h1 align="center">Not Found - 404 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_404.png?raw=true" alt="404 Image">`;
        break;
      case 417:
        innerHTML += `<h1 align="center">Expectation Failed - 417 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_417.png?raw=true" alt="417 Image">`;
        break;
      case 500:
        innerHTML += `<h1 align="center">Internal Server Error - 500 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_500.png?raw=true" alt="500 Image">`;
        break;
      case 503:
        innerHTML += `<h1 align="center">Service Unavailable - 503 Error</h1>`;
        innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_503.png?raw=true" alt="503 Image">`;
        break;
      default:
        if (currStatus != 200 && currStatus != 201 && currStatus != 202 && currStatus != 203 && currStatus != 204 && currStatus != 205 && currStatus != 206 && currStatus != 207 && currStatus != 208 && currStatus != 226) {
          innerHTML += `<h1 align="center"> Misc. ` + currStatus + ` Error</h1>`;
          innerHTML += `<img class="prequel-img" src="https://github.com/sahilmgandhi/prequel-error-codes/blob/master/img/error_misc.png?raw=true" alt="Misc Image">`;
        } else {
          return;
        }
    }

    innerHTML += `</div> </div>`;
    wrapper.innerHTML = innerHTML;

    // Show the modal
    document.body.appendChild(wrapper);
    modal = document.querySelector(".prequel-modal");
    modal.classList.toggle("prequel-show-modal");

    closeButton = document.querySelector(".prequel-close-button");
    closeButton.addEventListener("click", toggleModal);
  }
}

function toggleModal() {
  modal.classList.toggle("prequel-show-modal");
}