import { Component } from 'react';
import Fetch from 'react-fetch-component';
import { YearInput, MonthInput } from 'semantic-ui-calendar-react';
import {
  Dimmer, Loader, Tab, Icon, Modal, Button, Menu,
} from 'semantic-ui-react';
import styled from 'styled-components';

import AuthUser from './AuthUser';
import Statistic from './dashboard/Statistic';
import MonthlyStats from './dashboard/MonthlyStats';
import Trips from './dashboard/Trips';

import API from '../util/api';

import Transactions from './dashboard/Transactions';

const Container = styled.div`
  display: grid;
  box-sizing: border-box;

  grid-template-columns: 240px 1fr;
  grid-template-rows: 1fr 50px;
  grid-template-areas:
    'sidenav main'
    'sidenav footer';
  height: 100vh;

  .sidenav {
    grid-area: sidenav;

    .sidenav-container {
      display: flex;
      justify-content: stretch;
      flex-direction: column;
      padding: 20px;
    }
  }

  .main {
    grid-area: main;
    /* background-color: #8fd4d9; */

    .main-header {
      top: 0;
      display: flex;
      justify-content: flex-start;
      padding: 20px;
      background: linear-gradient(to bottom, #4e54c8, #8f94fb);
      height: 400px;
      color: white;
      z-index: 1;
    }

    .main-overview-container {
      z-index: 10;
      border-radius: 0.5em;
      margin-top: -300px;
      margin-left: 30px;
      margin-right: 15px;
      border: 1px solid lightgrey;
      background: white;
    }

    .main-overview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      align-items: left;
      flex-direction: row;
      margin: 20px;
    }

    .main-overview {
      display: flex;
      justify-content: center;
      align-items: left;
      flex-direction: column;
      background: white;
      padding: 20px;
      margin: 20px;
      border-radius: 0.5em;
      box-shadow: 0px 5px 20px -5px rgba(0, 0, 0, 0.45);
    }

    .main-cards {
      column-count: 3;
      column-gap: 20px;
      margin: 20px;
      z-index: 10;
    }

    .card {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-bottom: 20px;
      -webkit-column-break-inside: avoid;
      padding: 24px;
      box-sizing: border-box;

      border-radius: 0.5em;
    }
  }
`;

const panes = [
  { menuItem: 'This Month' },
  { menuItem: 'Last Month' },
  { menuItem: { icon: 'calendar alternate outline' } },
];

export default class Dashboard extends Component {
  state = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    activeIndex: 0,
    open: false,
    selectedMonth: '',
    selectedYear: '',
  };

  close = () => this.setState({ open: false });

  handleCalChange = (event, { name, value }) => {
    console.log(name, value);
    this.setState({ [name]: value });
  };

  render() {
    const {
      year, month, open, selectedYear, selectedMonth, activeIndex,
    } = this.state;

    return (
      <AuthUser>
        {({ data, error, loading }) => {
          if (error) {
            return <div>{error.message}</div>;
          }

          if (!loading) {
            const {
              data: { user, currentMonth },
            } = data;
            const months = [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ];

            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();

            return (
              <>
                <Container>
                  <main className="main">
                    <div className="main-header">
                      <Statistic label="Card Balance" value={user.balance} />
                    </div>
                    <Fetch
                      url={`${API.root}${API.monthlyTransactions(year, month + 1)}`}
                      options={API.send('GET')}
                    >
                      {(payload) => {
                        if (payload.loading) {
                          return <Loader />;
                        }
                        console.log(payload.data.data.transactions);
                        return (
                          <div className="main-overview-container">
                            <div className="main-overview-header">
                              <h2>{`${months[month]} ${year}`}</h2>
                              <div>
                                <Tab
                                  menu={{ secondary: true }}
                                  activeIndex={activeIndex}
                                  panes={panes}
                                  onTabChange={(e, tab) => {
                                    if (tab.activeIndex === 0) {
                                      this.setState({
                                        month: thisMonth,
                                        year: thisYear,
                                      });
                                    } else if (tab.activeIndex === 1) {
                                      this.setState({
                                        month: thisMonth === 0 ? 11 : thisMonth - 1,
                                        year: thisMonth === 0 ? thisYear - 1 : thisYear,
                                      });
                                    } else if (tab.activeIndex === 2) {
                                      this.setState({ open: true });
                                    }

                                    this.setState({ activeIndex: tab.activeIndex });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="main-overview">
                              <MonthlyStats transactions={payload.data.data.transactions} />
                            </div>

                            <div className="main-cards">
                              <div className="card">
                                <Statistic
                                  label="Spent"
                                  value={`$${payload.data.data.totalAmount}`}
                                />
                              </div>
                              <div className="card">
                                <Statistic label="Taps" value={payload.data.data.totalTrips} />
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </Fetch>
                  </main>

                  <nav className="sidenav">
                    <div className="sidenav-container">
                      <Menu secondary vertical>
                        <Menu.Item name="Home" icon="home" active />
                        <Menu.Item name="Budget" icon="usd" />
                        <Menu.Item name="Trip History" icon="history" />
                        <Menu.Item name="All Transactions" icon="list" />
                      </Menu>
                    </div>
                  </nav>
                </Container>

                <Modal size="tiny" open={open} onClose={this.close}>
                  <Modal.Header>Choose Another Date</Modal.Header>
                  <Modal.Content>
                    <MonthInput
                      inline
                      closable
                      dateFormat="M"
                      name="selectedMonth"
                      maxDate={selectedYear == thisYear ? thisMonth + 1 : 12}
                      value={selectedMonth || thisMonth + 1}
                      onChange={this.handleCalChange}
                    />
                    <YearInput
                      inline
                      name="selectedYear"
                      closable
                      dateFormat="YYYY"
                      maxDate={thisYear}
                      minDate={2018}
                      value={selectedYear || thisYear}
                      onChange={this.handleCalChange}
                    />
                  </Modal.Content>
                  <Modal.Actions>
                    <Button negative>No</Button>
                    <Button
                      positive
                      icon="checkmark"
                      labelPosition="right"
                      content="Yes"
                      onClick={() => {
                        console.log(selectedYear, selectedMonth);
                        this.setState({
                          month: selectedMonth - 1,
                          year: selectedYear || thisYear,
                          open: false,
                        });
                      }}
                    />
                  </Modal.Actions>
                </Modal>
              </>
            );
          }

          return (
            <Dimmer active>
              <Loader />
            </Dimmer>
          );
        }}
      </AuthUser>
    );
  }
}
