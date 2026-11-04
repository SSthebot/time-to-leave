'use strict';

class InterfaceTour
{
    constructor(calendarApi, translations, documentRef = document)
    {
        this._calendarApi = calendarApi;
        this._translations = translations;
        this._document = documentRef;
        this._currentStep = 0;
        this._steps = [
            { title: 'times-title', body: 'times-body', art: 'times-art', selector: '#calendar-table-body .plus-sign' },
            { title: 'punch-title', body: 'punch-body', art: 'punch-art', selector: '#punch-button' },
            { title: 'alerts-title', body: 'alerts-body', art: 'alerts-art', selector: '#summary-unfinished-day', fallbackSelector: '#punch-button', destination: 'preferences', action: 'open-preferences' },
            { title: 'days-title', body: 'days-body', art: 'days-art', selector: '.weekday.waiver-trigger', fallbackSelector: '#switch-view', destination: 'waiver', action: 'open-waiver' }
        ];
        this._createDialog();
    }

    _createDialog()
    {
        const root = this._document.getElementById('interface-tour-root');
        const dialog = this._document.createElement('section');
        dialog.className = 'interface-tour';
        dialog.hidden = true;
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'interface-tour-title');
        dialog.innerHTML = `
            <div class="interface-tour-backdrop"></div>
            <div class="interface-tour-panel">
                <header class="interface-tour-topline">
                    <p class="interface-tour-label"></p>
                    <div class="interface-tour-action-group">
                        <p class="interface-tour-progress" aria-live="polite"></p>
                        <button class="interface-tour-close" type="button" aria-label="${this._translations.close}">&times;</button>
                    </div>
                </header>
                <div class="interface-tour-content">
                    <div class="interface-tour-art" aria-hidden="true"></div>
                    <h2 class="interface-tour-title" id="interface-tour-title"></h2>
                    <p class="interface-tour-body"></p>
                    <button class="interface-tour-open" type="button" hidden></button>
                </div>
                <footer class="interface-tour-actions">
                    <button class="interface-tour-skip" type="button"></button>
                    <div class="interface-tour-action-group">
                        <button class="interface-tour-back" type="button"></button>
                        <button class="interface-tour-next" type="button"></button>
                    </div>
                </footer>
            </div>`;
        root.append(dialog);
        this._dialog = dialog;
        this._dialog.querySelector('.interface-tour-label').textContent = this._translations.label;
        this._dialog.querySelector('.interface-tour-close').addEventListener('click', () => this._finish());
        this._dialog.querySelector('.interface-tour-skip').addEventListener('click', () => this._finish());
        this._dialog.querySelector('.interface-tour-back').addEventListener('click', () => this._showStep(this._currentStep - 1));
        this._dialog.querySelector('.interface-tour-next').addEventListener('click', () =>
        {
            if (this._currentStep === this._steps.length - 1)
            {
                this._finish();
            }
            else
            {
                this._showStep(this._currentStep + 1);
            }
        });
        this._dialog.querySelector('.interface-tour-open').addEventListener('click', () =>
        {
            const step = this._steps[this._currentStep];
            this._calendarApi.openInterfaceTourDestination(step.destination);
            this._finish();
        });
        this._dialog.addEventListener('keydown', (event) =>
        {
            if (event.key === 'Escape')
            {
                this._finish();
            }
            else if (event.key === 'ArrowRight' && this._currentStep < this._steps.length - 1)
            {
                this._showStep(this._currentStep + 1);
            }
            else if (event.key === 'ArrowLeft' && this._currentStep > 0)
            {
                this._showStep(this._currentStep - 1);
            }
        });
        this._document.defaultView.addEventListener('resize', () =>
        {
            this._positionPanel(this._activeTarget);
        });
    }

    start()
    {
        this._currentStep = 0;
        this._dialog.hidden = false;
        this._showStep(this._currentStep);
    }

    _showStep(index)
    {
        this._currentStep = index;
        const step = this._steps[index];
        this._dialog.querySelector('.interface-tour-progress').textContent = `${index + 1} / ${this._steps.length}`;
        this._dialog.querySelector('.interface-tour-title').textContent = this._translations[step.title];
        this._dialog.querySelector('.interface-tour-body').textContent = this._translations[step.body];
        this._dialog.querySelector('.interface-tour-art').textContent = this._translations[step.art];
        this._dialog.querySelector('.interface-tour-back').textContent = this._translations.back;
        this._dialog.querySelector('.interface-tour-back').disabled = index === 0;
        this._dialog.querySelector('.interface-tour-skip').textContent = this._translations.skip;
        this._dialog.querySelector('.interface-tour-next').textContent = index === this._steps.length - 1
            ? this._translations.finish
            : this._translations.next;

        const openButton = this._dialog.querySelector('.interface-tour-open');
        openButton.hidden = !step.destination;
        if (step.destination)
        {
            openButton.textContent = this._translations[step.action];
        }
        this._document.querySelectorAll('.tour-highlight').forEach((element) => element.classList.remove('tour-highlight'));

        let target;
        if (step.title === 'days-title')
        {
            const todaySummary = this._document.querySelector('#summary-unfinished-day, #summary-finished-day');
            target = todaySummary?.previousElementSibling?.querySelector('.weekday.waiver-trigger') ||
                this._document.querySelector(step.selector);
        }
        else
        {
            target = step.selector ? this._document.querySelector(step.selector) : null;
        }

        if (target)
        {
            target.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'instant' });
            const targetRect = target.getBoundingClientRect();
            if (targetRect.width === 0 || targetRect.height === 0)
            {
                target = null;
            }
        }
        if (!target && step.fallbackSelector)
        {
            target = this._document.querySelector(step.fallbackSelector);
        }
        if (target)
        {
            target.classList.add('tour-highlight');
        }
        this._activeTarget = target;
        this._positionPanel(target);
    }

    _positionPanel(target)
    {
        const panel = this._dialog.querySelector('.interface-tour-panel');
        const panelRect = panel.getBoundingClientRect();
        const viewportWidth = this._document.defaultView.innerWidth;
        const viewportHeight = this._document.defaultView.innerHeight;
        const margin = 16;
        const gap = 18;
        const width = panelRect.width || Math.min(440, viewportWidth - margin * 2);
        const height = panelRect.height || 360;
        let left = Math.max(margin, (viewportWidth - width) / 2);
        let top = Math.max(margin, (viewportHeight - height) / 2);
        let placement = 'center';

        if (target)
        {
            const rect = target.getBoundingClientRect();
            if (viewportWidth - rect.right >= width + gap + margin)
            {
                left = rect.right + gap;
                top = rect.top + rect.height / 2 - height / 2;
                placement = 'right';
            }
            else if (rect.left >= width + gap + margin)
            {
                left = rect.left - width - gap;
                top = rect.top + rect.height / 2 - height / 2;
                placement = 'left';
            }
            else if (viewportHeight - rect.bottom >= height + gap + margin)
            {
                left = rect.left + rect.width / 2 - width / 2;
                top = rect.bottom + gap;
                placement = 'below';
            }
            else
            {
                left = rect.left + rect.width / 2 - width / 2;
                top = rect.top - height - gap;
                placement = 'above';
            }
        }

        panel.style.left = `${Math.max(margin, Math.min(left, viewportWidth - width - margin))}px`;
        panel.style.top = `${Math.max(margin, Math.min(top, viewportHeight - height - margin))}px`;
        panel.dataset.placement = placement;
        if (target)
        {
            const targetRect = target.getBoundingClientRect();
            panel.style.setProperty('--tour-arrow-offset', `${Math.max(20, Math.min(
                (placement === 'left' || placement === 'right' ? targetRect.top + targetRect.height / 2 - Number.parseFloat(panel.style.top) : targetRect.left + targetRect.width / 2 - Number.parseFloat(panel.style.left)),
                (placement === 'left' || placement === 'right' ? height : width) - 20
            ))}px`);
        }
    }

    _finish()
    {
        this._dialog.hidden = true;
        this._document.querySelectorAll('.tour-highlight').forEach((element) => element.classList.remove('tour-highlight'));
        this._calendarApi.setInterfaceTourSeen(true);
    }
}

export default InterfaceTour;