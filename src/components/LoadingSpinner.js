
import spinnerSvg from '../assets/spinner.svg';

export class LoadingSpinner {
    constructor() {
        this._spinnerDiv = document.querySelector('.spinner');
        this._spinnerDiv.innerHTML = spinnerSvg;
    }

    show() {
        this._spinnerDiv.classList.add('show');
    }

    hide() {
        this._spinnerDiv.classList.add('hide');
    }

}