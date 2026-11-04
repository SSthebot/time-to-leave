'use strict';

import assert from 'assert';
import { JSDOM } from 'jsdom';

import InterfaceTour from '../../src/interface-tour.js';

const translations = {
    label: 'Getting started',
    'times-title': 'Add work times',
    'times-body': 'Choose a date and enter times.',
    'times-art': '+ 08:30',
    'punch-title': 'Punch in',
    'punch-body': 'Record the current time.',
    'punch-art': 'Punch time',
    'alerts-title': 'Leave alerts',
    'alerts-body': 'Enable notifications in preferences.',
    'alerts-art': 'Preferences > Notifications',
    'open-preferences': 'Open notification settings',
    'days-title': 'Holidays and waiver days',
    'days-body': 'Manage days in the waiver manager.',
    'days-art': 'Workday Waiver Manager',
    'open-waiver': 'Open waiver manager',
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    close: 'Close tour'
};

describe('InterfaceTour', () =>
{
    let dom;
    let completionValues;
    let destinations;
    let tour;

    beforeEach(() =>
    {
        dom = new JSDOM('<div id="interface-tour-root"></div><div id="calendar-table-body"><button class="plus-sign"></button></div><button id="punch-button"></button><div id="summary-unfinished-day"></div><div class="weekday waiver-trigger"></div>', { pretendToBeVisual: true });
        Object.defineProperty(dom.window, 'innerWidth', { value: 1200, configurable: true });
        Object.defineProperty(dom.window, 'innerHeight', { value: 800, configurable: true });
        const targetRects = new Map([
            [dom.window.document.querySelector('.plus-sign'), { x: 100, y: 120, left: 100, top: 120, right: 130, bottom: 150, width: 30, height: 30 }],
            [dom.window.document.querySelector('#punch-button'), { x: 100, y: 650, left: 100, top: 650, right: 180, bottom: 690, width: 80, height: 40 }],
            [dom.window.document.querySelector('#summary-unfinished-day'), { x: 1000, y: 520, left: 1000, top: 520, right: 1160, bottom: 570, width: 160, height: 50 }],
            [dom.window.document.querySelector('.waiver-trigger'), { x: 1100, y: 100, left: 1100, top: 100, right: 1140, bottom: 140, width: 40, height: 40 }]
        ]);
        targetRects.forEach((rect, element) => element.getBoundingClientRect = () => rect);
        completionValues = [];
        destinations = [];
        tour = new InterfaceTour({
            setInterfaceTourSeen: (seen) => completionValues.push(seen),
            openInterfaceTourDestination: (destination) => destinations.push(destination)
        }, translations, dom.window.document);
    });

    it('walks through four slides and highlights their calendar controls', () =>
    {
        tour.start();
        const dialog = dom.window.document.querySelector('.interface-tour');
        const next = dialog.querySelector('.interface-tour-next');

        assert.strictEqual(dialog.hidden, false);
        assert.strictEqual(dialog.querySelector('.interface-tour-progress').textContent, '1 / 4');
        assert.strictEqual(dom.window.document.querySelector('.plus-sign').classList.contains('tour-highlight'), true);
        assert.strictEqual(dialog.querySelector('.interface-tour-panel').dataset.placement, 'right');

        next.click();
        assert.strictEqual(dialog.querySelector('.interface-tour-title').textContent, 'Punch in');
        assert.strictEqual(dom.window.document.querySelector('#punch-button').classList.contains('tour-highlight'), true);
        next.click();
        assert.strictEqual(dialog.querySelector('.interface-tour-title').textContent, 'Leave alerts');
        assert.strictEqual(dom.window.document.querySelector('#summary-unfinished-day').classList.contains('tour-highlight'), true);
        assert.strictEqual(dialog.querySelector('.interface-tour-open').textContent, 'Open notification settings');
        next.click();
        assert.strictEqual(dom.window.document.querySelector('.waiver-trigger').classList.contains('tour-highlight'), true);
        assert.strictEqual(dialog.querySelector('.interface-tour-open').textContent, 'Open waiver manager');
        assert.strictEqual(next.textContent, 'Finish');
        next.click();

        assert.strictEqual(dialog.hidden, true);
        assert.deepStrictEqual(completionValues, [true]);
        assert.strictEqual(dom.window.document.querySelector('.tour-highlight'), null);
    });

    it('allows skipping and replaying the tour', () =>
    {
        tour.start();
        const dialog = dom.window.document.querySelector('.interface-tour');
        dialog.querySelector('.interface-tour-skip').click();
        tour.start();

        assert.strictEqual(dialog.querySelector('.interface-tour-progress').textContent, '1 / 4');
        dialog.querySelector('.interface-tour-next').click();
        dialog.querySelector('.interface-tour-next').click();
        dialog.querySelector('.interface-tour-open').click();
        assert.deepStrictEqual(destinations, ['preferences']);

        tour.start();
        dom.window.document.querySelector('.interface-tour-close').click();
        assert.deepStrictEqual(completionValues, [true, true, true]);
    });

    it('anchors waiver guidance to the view switch when the month-only control is absent', () =>
    {
        const switchView = dom.window.document.createElement('button');
        switchView.id = 'switch-view';
        dom.window.document.body.append(switchView);
        switchView.getBoundingClientRect = () => ({ x: 100, y: 80, left: 100, top: 80, right: 140, bottom: 120, width: 40, height: 40 });
        dom.window.document.querySelector('.waiver-trigger').remove();

        tour.start();
        tour._showStep(3);

        assert.strictEqual(switchView.classList.contains('tour-highlight'), true);
        assert.strictEqual(dom.window.document.querySelector('.interface-tour-panel').dataset.placement, 'right');
    });

    it('points to the weekday control beside today\'s summary', () =>
    {
        const documentRef = dom.window.document;
        documentRef.querySelector('#summary-unfinished-day').remove();
        const otherWeekday = documentRef.querySelector('.waiver-trigger');
        const todayRow = documentRef.createElement('div');
        todayRow.innerHTML = '<div class="weekday waiver-trigger" id="today-waiver"></div>';
        const summary = documentRef.createElement('div');
        summary.id = 'summary-unfinished-day';
        documentRef.body.append(todayRow, summary);
        const todayTarget = todayRow.querySelector('.waiver-trigger');
        todayTarget.getBoundingClientRect = () => ({ x: 200, y: 120, left: 200, top: 120, right: 240, bottom: 160, width: 40, height: 40 });

        tour.start();
        tour._showStep(3);

        assert.strictEqual(todayTarget.classList.contains('tour-highlight'), true);
        assert.strictEqual(otherWeekday.classList.contains('tour-highlight'), false);
    });
});