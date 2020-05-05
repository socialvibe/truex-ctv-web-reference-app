
import './loading-spinner.scss';
import spinnerSvg from '../assets/spinner.svg';

export class LoadingSpinner {
    constructor() {
        this._spinnerDiv = document.querySelector('.loading-spinner');
        this._spinnerDiv.innerHTML = spinnerSvg;
    }

    show() {
        this._spinnerDiv.classList.add('show');
    }

    hide() {
        this._spinnerDiv.classList.remove('show');
    }

}