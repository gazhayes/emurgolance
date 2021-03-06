import { chai, assert } from 'chai'
import { Meteor } from 'meteor/meteor'

import { Timesheet } from './timesheet'
import './methods'

import { callWithPromise } from '/imports/api/utilities'

Meteor.userId = () => 'test-user' // override the meteor userId, so we can test methods that require a user
Meteor.users.findOne = () => ({ profile: { name: 'Test User'} }) // stub user data as well
Meteor.user = () => ({ profile: { name: 'Test User'} })

describe('Timesheet methods', () => {
    it('user can start working on a valid issue', () => {
        const issue = 'https://github.com/EmurgoHK/emurgolance/issues/67'

        return callWithPromise('startWork', {
            issue: issue
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: tId
            })

            assert.ok(timesheet)
            assert.equal(timesheet.issue, issue)
            assert.ok(timesheet.active)
            assert.equal(timesheet.project, 'Emurgolance'.toLowerCase())
        })
    }).timeout(15000)

    it('user cannot start working on an invalid issue', () => {
        const issue = 'testing'

        return callWithPromise('startWork', {
            issue: issue
        }).then(tId => {
            assert.isNull(tId)
        }).catch(err => {
            assert.include(err.message.toLowerCase(), 'invalid issue')
        })
    }).timeout(15000)

    it('user cannot start working on two issues at the same time', () => {
        const issue = 'https://github.com/EmurgoHK/emurgolance/issues/67'

        return callWithPromise('startWork', {
            issue: issue
        }).then(tId => {
            assert.isNull(tId)
        }).catch(err => {
            assert.include(err.message, 'You can only start one task at a time')
        })
    }).timeout(15000)

    it('user can pause working on an issue', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            active: true
        })

        assert.ok(work)

        return callWithPromise('pauseWork', {
            workId: work._id
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: work._id
            })

            assert.ok(timesheet)
            assert.ok(timesheet.paused)
            assert.notOk(timesheet.active)
            assert.ok(timesheet.totalTime > 0)
        })
    })

    it('user cannot pause working on an inactive issue', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            active: false
        })

        assert.ok(work)

        return callWithPromise('pauseWork', {
            workId: work._id
        }).then(tId => {
            assert.isNull(tId)
        }).catch(err => {
            assert.include(err.message, 'You can\'t pause work that\'s has been completed')
        })
    })

    it('user can continue working on an issue', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            paused: true
        })

        assert.ok(work)

        return callWithPromise('continueWork', {
            workId: work._id
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: work._id
            })

            assert.ok(timesheet)
            assert.notOk(timesheet.paused)
            assert.ok(timesheet.active)
            assert.ok(timesheet.totalTime > 0)
        })
    })

    it('user cannot continue working on an issue that has\'t been paused', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            paused: false
        })

        assert.ok(work)

        return callWithPromise('continueWork', {
            workId: work._id
        }).then(tId => {
            assert.isNull(tId)
        }).catch(err => {
            assert.include(err.message, 'You can\'t continue work that\'s hasn\'t been paused')
        })
    })

    it('user can edit time spent working on an issue', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId()
        })

        assert.ok(work)

        return callWithPromise('editWork', {
            workId: work._id,
            newTotal: 600000 // 00:10:00
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: work._id
            })

            assert.ok(timesheet)
            assert.ok(timesheet.history.length > 0)
            assert.ok(timesheet.totalTime >= 600000)
        })
    })

    it('user can finish working on an issue', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            active: true
        })

        assert.ok(work)

        return callWithPromise('finishWork', {
            workId: work._id
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: work._id
            })

            assert.ok(timesheet)
            assert.notOk(timesheet.paused)
            assert.notOk(timesheet.active)
            assert.ok(timesheet.finished)
            assert.ok(timesheet.totalTime > 0)
        })
    })

    it('user cannot finish working on an issue that\'s not currently active', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId(),
            active: false
        })

        assert.ok(work)

        return callWithPromise('finishWork', {
            workId: work._id
        }).then(tId => {
            assert.isNull(tId)
        }).catch(err => {
            assert.include(err.message, 'You can\'t finish work that\'s not active')
        })
    })

    it('user can remove a timecard if necessary', () => {
        let work = Timesheet.findOne({
            owner: Meteor.userId()
        })

        assert.ok(work)

        return callWithPromise('deleteWork', {
            workId: work._id
        }).then(tId => {
            let timesheet = Timesheet.findOne({
                _id: work._id
            })

            assert.notOk(timesheet)
        })
    })

    after(function() {
        Timesheet.remove({
            owner: Meteor.userId()
        })
    })
})
