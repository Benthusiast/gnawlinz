import axios from 'axios';
import Nav from '../nav/NavBar';
import Result from '../result/Result';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { ReactNode } from 'react';
import images from '../../utility/images';

import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

import React, { useEffect, useContext, useState } from 'react';
import Modal from 'react-bootstrap/Modal';

import {
  Container,
  Main,
  Content1,
  KillFeed,
  KillFeedContainer,
  Content2,
  Content3,
  Footer,
  HudButton,
  InventoryTextBubble,
  EventText,
  StatContainer,
  ScrollableContainer,
  AllyImg,
  EnemyImg,
  CharImageStyles,
  CharStatusContainer,
  IconContainer,
  IconImg,
  InventoryBorder,
  InventoryStyle,
  StatBonusColor,
  StatContainer2,
  StatIconContainer,
  Page,
  TinyStatIconImg,
  TempStatBonusColor,
  ModalBodyContainer,
  StyledModal,
  ArcadeButton,
  ProgressBarContainer,
  OverlayValue,
  ArcadeButtonInvestigate,
  ArcadeButtonToggle,
  LocationImg,
  LocationDiv,
  IntroModal,
  ModalStyle,
  LCDDiv,
  ArcadeWoodStyle,
  InventoryBubbleText,
  InventoryBottomTextBubble,
  MainGlow,
  LCDGlow,
  EnemyImgContainer,
} from './Styled'; //ContentBox

import { Link } from 'react-router-dom';
import { UserContext } from '../../App';
import {
  EventData,
  ChoiceData,
  Enemy,
  Ally,
  Item,
  Character,
  GameViewProps,
  Boss,
} from '../../utility/interface';

import {
  statCheck,
  fightEnemy,
  isEnemy,
  addItem,
} from '../../utility/gameUtils';
import {
  complete,
  hit,
  dodge,
  evacuate,
  wildCard,
  click,
  neutral,
  heartBeat,
  bunny,
  cancel,
  spray,
  onChar,
  onLocation,
} from '../../utility/sounds';

const GameView = (props: GameViewProps) => {
  window.onerror = () => {
    window.location.href = '/menu';
  };
  const {
    prevEventId,
    setPrevEventId,
    visited,
    setVisited,
    allLocations,
    setAllLocations,
    location,
    setLocation,
    currentChar,
    setCurrentChar,
    event,
    setEvent,
    selectedChoice,
    setSelectedChoice,
    choices,
    setChoices,
    outcome,
    setOutcome,
    investigateDisabled,
    setInvestigateDisabled,
    tagDisabled,
    setTagDisabled,
    currentEnemy,
    setCurrentEnemy,
    currentAlly,
    setCurrentAlly,
    metAllyArr,
    setMetAllyArr,
    fetchedInventory,
  } = useContext(UserContext);

  // state for socket.io
  const [socket, setSocket] = useState<Socket | undefined>();
  const [killFeed, setKillFeed] = useState<string[]>([]);

  // state for investigate modal
  const [modalText, setModalText] = useState<ReactNode>('');
  const [showTextBox, setShowTextBox] = useState(false);
  const [show, setShow] = useState(false);
  const [locationModalText, setLocationModalText] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tagButtonDisabled, setTagButtonDisabled] = useState(true);

  // Intro modal
  const [introModal, setIntroModal] = useState(true);

  const [tempText, setTempText] = useState('');
  const [penalty, setPenalty] = useState('');
  const [showEnemy, setShowEnemy] = useState(false);
  const [showAlly, setShowAlly] = useState(false);
  const [damageToEnemy, setDamageToEnemy] = useState(0);
  const [damageToPlayer, setDamageToPlayer] = useState(0);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [bossMaxHealth, setBossMaxHealth] = useState(0);
  const [boss75, setBoss75] = useState(false);
  const [boss50, setBoss50] = useState(false);
  const [boss25, setBoss25] = useState(false);

  const [bonusStrength, setBonusStrength] = useState(0);
  const [bonusEndurance, setBonusEndurance] = useState(0);
  const [bonusMood, setBonusMood] = useState(0);

  const [temporaryStrength, setTemporaryStrength] = useState(0);
  const [temporaryEndurance, setTemporaryEndurance] = useState(0);
  const [temporaryMood, setTemporaryMood] = useState(0);

  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(true);

  const fetchEvent = (bossEvent = 0) => {
    setTempText('');
    if (bossEvent) {
      // <-- EDIT
      axios
        .get<EventData>(`/event/${bossEvent}`)
        .then((event) => {
          setEvent(event.data);
          setChoices({
            engage: event.data.choice0,
            evade: event.data.choice1,
            evacuate: event.data.choice2,
            wildcard: event.data.choice3,
          });
        })
        .catch((err) => console.error('fetch specific event failure', err));
    } else {
      axios
        .get<EventData>('/event/random', {
          params: { excludeEventId: prevEventId },
        })
        .then((event) => {
          setEvent(event.data);
          setChoices({
            engage: event.data.choice0,
            evade: event.data.choice1,
            evacuate: event.data.choice2,
            wildcard: event.data.choice3,
          });
          setPrevEventId(event.data._id);
          if (event.data.enemy_effect) {
            // console.log('FETCH ENEMY???', event.data);
            handleEnemyFetch();
            setEvent((prevEvent) => ({
              ...prevEvent,
              enemy_effect: false,
            }));
          } else {
            setCurrentEnemy({});
          }
          // if (event.data.ally_effect) {
          //   handleAllyFetch();
          //   setEvent((prevEvent) => ({
          //     ...prevEvent,
          //     ally_effect: false,
          //   }));
          // } else {
          //   setCurrentAlly({});
          // }
        })
        .catch((err) => {
          console.error('RANDOM EVENT FETCH FAILED', err);
        });
    }
  };

  const handleClickButt = () => {
    setInvestigateDisabled(true);
  };

  const handleToggleEvent = () => {
    setShowEvent(showEvent ? false : true);
  };

  const handleTagClick = () => {
    spray.play();
    setTagDisabled(true);
  };

  // NPC
  const handleEnemyFetch = () => {
    // Math.random to query enemy database w/ _id <-- NEEDS TO BE # OF ENEMIES IN DB
    axios
      .get<Enemy>(`/enemy/${Math.floor(Math.random() * 6) + 1}`)
      .then((enemy: any) => {
        setCurrentEnemy(enemy.data);
      })
      .catch((err) => console.error('FETCH ENEMY ERROR', err));
  };

  const handleAllyFetch = () => {
    // Math.random to query enemy database w/ _id <-- NEEDS TO BE # OF ALLIES IN DB
    axios
      .get<Ally>(`/ally/${Math.floor(Math.random() * 2) + 1}`)
      .then((ally: any) => {
        // if (metAllyArr.includes(ally.data._id)) {
        // setCurrentAlly({});
        // } else {
        setMetAllyArr((prevMetAllyArr) => [...prevMetAllyArr, ally.data._id]);
        setCurrentAlly(ally.data);
        //}
        //console.log('ally fetched, sending to state...');
        // <-- put ally.data.image_url somewhere into HUD to indicate enemy
      })
      .catch((err) => console.error('FETCH ENEMY ERROR', err));
  };

  // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!', currentEnemy);

  const getAllLocations = (buttonClick = -1) => {
    // console.log('Current Event on State: ', event);
    if (buttonClick > -1) {
      console.log('char loc: ', currentChar.location, 'boss location: ', boss?.location, 'headed to location: ', visited[buttonClick]._id);
      currentChar.location = visited[buttonClick]._id;
      if (visited[buttonClick]._id === boss?.location) {
        bunny.play(); // <-- if bunny, gets duplicated... is okay.
        setCurrentEnemy(boss);
        fetchEvent(4);
        setShowEnemy(true);
        }
    }
    axios
      .get('/location/allLocations')
      .then((locations) => {
        setVisited(
          locations.data.filter(
            (current) => current._id === currentChar.location
          )
        );
        setAllLocations(
          locations.data.filter(
            (current) => current._id !== currentChar.location
          )
        );
        setLocation(
          locations.data.filter(
            (current) => current._id === currentChar.location
          )[0]
        );
        if (!Object.entries(event).length) {
          // console.log('!OBJECT.ENTRIES.LENGTH');
          // if (currentChar.location._id === boss?.location) {
          //   fetchEvent(4);
          // } else {
          //   fetchEvent();
          // }
          fetchEvent();
        }
      })
      .catch((err) => {
        console.error('Failed to retrieve all locations: ', err);
      });
    setInvestigateDisabled(false);
    setTagDisabled(false);
  };

  // Add a modal to handle location change after all locations have been used
  const handleShowLocationModal = () => setShowLocationModal(true);
  const handleCloseLocationModal = () => setShowLocationModal(false);

  const handleLocationChange = () => {
    fetchBoss();
    setTemporaryMood(0);
    setTemporaryStrength(0);
    setTemporaryStrength(0);
    setShowAlly(false);
    setShowEnemy(false);
    setOutcome('');
    setSelectedChoice({} as ChoiceData);
    if (!allLocations.length) {
      setLocationModalText('true');
      handleShowLocationModal();
      return;
    }
    setAllLocations((prevLocations) => prevLocations.slice(1));
    setLocation(allLocations[0]);
    setCurrentChar((prevStats) => ({
      ...prevStats,
      location: allLocations[0]._id,
    }));

    setVisited((prevVisited) => [...prevVisited, allLocations[0]]);
    visited.forEach((location, i) => {
      localStorage.setItem(i.toString(), location.name);
    });

    if (allLocations[0]._id === boss?.location) {
      // <-- CODE
      fetchEvent(boss?.event);
      setTempText('');
      setCurrentEnemy(boss);
      // setTimeout(() => {
      //   bunny.play();
      //   setShowEnemy(true);
      // }, 400); // <-- reduce
      bunny.play(); // both sounds fire (two different spots of the code)
      setShowEnemy(true);
      return;
    }
    fetchEvent();
    setInvestigateDisabled(false);
    setTagDisabled(false);
  };

  //  Item handling Functions drag and drop on location and character.
  //  *********************************************************************************************************************************************************************************************

  const handleOnMouseEnter = (itemOrButton: Item | string) => {
    if (typeof itemOrButton === 'string') {
      if (itemOrButton === 'investigate') {
        setTooltip('Search for an item Search for graffiti Write graffiti');
      } else if (itemOrButton === 'toggle') {
        setTooltip('Toggle story text box on or off');
      } else if (itemOrButton === 'engage') {
        setTooltip('Risk health to fight enemy [uses STR]');
      } else if (itemOrButton === 'evade') {
        setTooltip('Risk combat to find item [uses END]');
      } else if (itemOrButton === 'evacuate') {
        setTooltip('Safely move to new location');
      } else if (itemOrButton === 'wildcard') {
        setTooltip('Risk mood to find item [uses MOOD]');
      }
    } else {
      if (itemOrButton._id !== 1) {
        setHoveredItem(itemOrButton);
      }
    }
  };

  const handleOnMouseLeave = () => {
    setHoveredItem(null);
    setTooltip(null);
  };

  const handleDropItem = async (itemID, i) => {
    // console.log('location in handleDropItem', location);
    await setLocation((currLocation) => ({
      ...currLocation,
      drop_item_slot: itemID,
    }));

    await setCurrentChar((previousStats) => {
      const undroppedInventory = previousStats.inventory;
      undroppedInventory[i] = 1;
      return {
        ...previousStats,
        inventory: undroppedInventory,
      };
    });
  };

  const handleDropItemChar = (itemID, i) => {
    if (fetchedInventory[i].consumable === true) {
      onChar.play();
      setCurrentChar((previousStats) => {
        const undroppedInventory = previousStats.inventory;
        undroppedInventory[i] = 1;
        return {
          ...previousStats,
          inventory: undroppedInventory,
        };
      });

      if (fetchedInventory[i].modified_stat0 === 'strength') {
        setTemporaryStrength(temporaryStrength + fetchedInventory[i].modifier0);
      }
      if (fetchedInventory[i].modified_stat1 === 'strength') {
        setTemporaryStrength(temporaryStrength + fetchedInventory[i].modifier1);
      }
      if (fetchedInventory[i].modified_stat0 === 'endurance') {
        setTemporaryEndurance(
          temporaryEndurance + fetchedInventory[i].modifier0
        );
      }
      if (fetchedInventory[i].modified_stat1 === 'endurance') {
        setTemporaryEndurance(
          temporaryEndurance + fetchedInventory[i].modifier1
        );
      }
      if (fetchedInventory[i].modified_stat0 === 'mood') {
        setTemporaryMood(temporaryMood + fetchedInventory[i].modifier0);
      }
      if (fetchedInventory[i].modified_stat1 === 'mood') {
        setTemporaryMood(temporaryMood + fetchedInventory[i].modifier1);
      }
      if (fetchedInventory[i].modified_stat0 === 'health') {
        setCurrentChar((previousStats) => {
          return {
            ...previousStats,
            health: previousStats.health + fetchedInventory[i].modifier0,
          };
        });
      }
      if (fetchedInventory[i].modified_stat1 === 'health') {
        setCurrentChar((previousStats) => {
          return {
            ...previousStats,
            health: previousStats.health + fetchedInventory[i].modifier1,
          };
        });
      }
    } else {
      cancel.play();
    }
  };

  const handleOnDragItem = (e: React.DragEvent, itemId: number, i: number) => {
    const itemIdIndex = [itemId, i];
    e.dataTransfer.setData('itemWidget', JSON.stringify(itemIdIndex));
  };

  const itemBonuses = async () => {
    let strength = 0;
    let endurance = 0;
    let mood = 0;
    fetchedInventory.forEach((item) => {
      if (item.consumable === false) {
        if (item.modified_stat0 === 'strength') {
          strength += item.modifier0;
        }
        if (item.modified_stat1 === 'strength') {
          strength += item.modifier1;
        }
        if (item.modified_stat0 === 'endurance') {
          endurance += item.modifier0;
        }
        if (item.modified_stat1 === 'endurance') {
          endurance += item.modifier1;
        }
        if (item.modified_stat0 === 'mood') {
          mood += item.modifier0;
        }
        if (item.modified_stat1 === 'mood') {
          mood += item.modifier1;
        }
      }
    });
    await setBonusStrength(strength);
    await setBonusEndurance(endurance);
    await setBonusMood(mood);
  };

  const handleDropItemOnCharacter = (e: React.DragEvent) => {
    const itemWidget = e.dataTransfer.getData('itemWidget') as string;
    const itemArr = JSON.parse(itemWidget);
    if (itemArr[0] !== 1) {
      handleDropItemChar(itemArr[0], itemArr[1]);
    }
  };

  const handleDropItemOnLocation = (e: React.DragEvent) => {
    onLocation.play();
    const itemWidget = e.dataTransfer.getData('itemWidget') as string;
    const itemArr = JSON.parse(itemWidget);
    const inventoryItem = fetchedInventory[itemArr[1]];
    //  removes item bonus from state when item is dropped
    if (inventoryItem.consumable === false && inventoryItem._id !== 1) {
      if (inventoryItem.modified_stat0 === 'strength') {
        setBonusStrength(bonusStrength - inventoryItem.modifier0);
      }
      if (inventoryItem.modified_stat1 === 'strength') {
        setBonusStrength(bonusStrength - inventoryItem.modifier1);
      }
      if (inventoryItem.modified_stat0 === 'endurance') {
        setBonusEndurance(bonusEndurance - inventoryItem.modifier0);
      }
      if (inventoryItem.modified_stat1 === 'endurance') {
        setBonusEndurance(bonusEndurance - inventoryItem.modifier1);
      }
      if (inventoryItem.modified_stat0 === 'mood') {
        setBonusMood(bonusMood - inventoryItem.modifier0);
      }
      if (inventoryItem.modified_stat1 === 'mood') {
        setBonusMood(bonusMood - inventoryItem.modifier1);
      }
    }
    if (itemArr[0] !== 1) {
      handleDropItem(itemArr[0], itemArr[1]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  //  *********************************************************************************************************************************************************************************************

  const resolveChoice = (
    choice_id: number,
    choiceType: string,
    stat: number,
    penalty = ''
  ) => {
    setPenalty(penalty);
    setTempText('');
    setDamageToEnemy(0);
    setDamageToPlayer(0);
    //console.log('choice from click?', choice_id);
    // ATM evacuate will not fail...
    if (choiceType === 'evacuate') {
      handleLocationChange();
      return;
    }
    // look up choice_id from action Button click
    axios
      .get<ChoiceData>(`/choice/selected/${choice_id}`) //upon refactor, take all the functionality out of the axios request
      .then((choiceResponse) => {
        setSelectedChoice(choiceResponse.data);
        // <-- computation for success check: -->
        const choiceOutcome = statCheck(stat); // <-- argument from action Button click
        // <-- choices valid for combat -->
        if (
          choiceType === 'engage' ||
          (choiceType === 'evade' && choiceOutcome === 'failure')
        ) {
          // <-- enemy Effect TRUE on choice to hit below IF block -->
          if (isEnemy(currentEnemy) && currentEnemy.health > 0) {
            // <-- Enemy exists, enemy !dead
            setShowEnemy(true);
            const fightResult = fightEnemy(
              currentEnemy.strength,
              currentEnemy.health,
              stat,
              currentChar.health
            );
            // <-- player loses, adjust player health below
            if (fightResult.player || fightResult.player === 0) {
              if (fightResult.player <= 0) {
                axios
                  .post(`story/ending/${currentChar._id}`, {
                    result: currentEnemy.defeat,
                  })
                  .catch((err) =>
                    console.error('Failed to add story on death: ', err)
                  );
                setOutcome(choiceOutcome);
              }
              setDamageToPlayer(fightResult.damage);
              setCurrentChar((prevChar: any) => ({
                ...prevChar,
                health: fightResult.player,
              }));
              setTempText(
                `The ${currentEnemy.name} hit you with a ${currentEnemy.weapon1} for ${fightResult.damage} damage!`
              );
              // return;
              // <-- enemy loses, adjust player health below
            } else if (fightResult?.enemy || fightResult.enemy === 0) {
              setDamageToEnemy(fightResult.damage);
              setCurrentEnemy((prevEnemy: any) => ({
                ...prevEnemy,
                health: fightResult.enemy,
              })); // could display enemy health: fightResult.enemy
              setTempText(
                `You hit the ${currentEnemy.name} for ${fightResult.damage} damage!`
              );
              if (currentEnemy.name === boss?.name) {
                bossHealthPatch(fightResult.enemy);
              }
              return;
            }
          } else if (isEnemy(currentEnemy) && currentEnemy.health <= 0) {
            // <-- enemy exists, enemy dead
            axios
              .post(
                `story/ending/${currentChar._id}`, // <-- ADD PLAYER KILL ENEMY TO STORY
                {
                  result: currentEnemy.victory,
                }
              )
              .catch((err) =>
                console.error('Failed to add story on death: ', err)
              );
            setOutcome(choiceOutcome);
            setShowEnemy(false);
            // <-- give the player something...
            setCurrentChar((prevChar) => ({
              ...prevChar,
              score: (prevChar.score += currentEnemy.score),
            }));
            setTempText(
              `You defeated the enemy and got ${currentEnemy.score} points!`
            ); // <-- put effects on canvas?? ***
            // choiceOutcome = 'success';
            setCurrentEnemy({});
            if (currentEnemy.name === boss?.name) {
              bossHealthPatch(500); // <-- hardcoded to reset Nick Un-caged
            }
          } else {
            // <-- no Enemy on Event/State (enemy !exist)
            // setOutcome('You explored part of the city, but found no signs of life.');
            // <-- succeed Engage roll mechanics here (no enemy)
            return;
          }
        } else {
          // <-- evacuate || wildcard || evade && success
          // specify difficulty on enemy (add to schema) to create dynamic weight for success/fail calculation
          // arbitrate item acquisition with percentage || algorithm

          if (
            choiceOutcome === 'success' /*&& choiceType === 'wildcard') || choiceType === 'evade'*/
          ) {
            if ( currentChar.inventory.filter(slot => slot === 1).length > 0 ) {
              if (choiceType === 'evade') {
                setTempText(
                  'You stealthily made your way through the area, and collected an item!'
                );
                setCurrentChar((prevChar) => ({
                  ...prevChar,
                  inventory: addItem(
                    currentChar.inventory,
                    Math.floor(Math.random() * 11) + 1
                  ),
                }));
              } else if (choiceType === 'wildcard') {
                setTempText(
                  'You made contact with a survivor, who shared an item with you!'
                );
                setCurrentChar((prevChar) => ({
                  ...prevChar,
                  inventory: addItem(
                    currentChar.inventory,
                    Math.floor(Math.random() * 11) + 1
                  ),
                }));
              }
            // --> player gets item
          } else {
            setTempText (
              'Your inventory is full, so you cannot carry additional items!'
            );
          }
          // <-- evacuate WORKS already...
          setOutcome(choiceOutcome); // <-- success or fail to story
        }
      }
        // <-- HOPEFULLY NO CONDITIONS TO CALL setOutcome(choiceOutcome);
      })
      .catch((err) => {
        console.error('Failed setting selectedChoice State', err);
      });
  };

  const throttle = (cb, delay = 1000) => {
    let shouldWait = false;

    return (...args) => {
      if (shouldWait) {
        return;
      }

      cb(...args);
      shouldWait = true;
      setTimeout(() => {
        shouldWait = false;
      }, delay);
    };
  };

  const broadcastBossHealth = (bossHealth) => {
    socket?.emit('boss_health', boss?.name, location.name, bossHealth);
  };

  const bossHealthPatch = (patchHealth) => {
    axios.patch('/boss/patch/1', { health: patchHealth }); // **
  };

  // callback for PlayerDied event listener
  // const appendToKillFeed = throttle((death: string) => {
  //   setKillFeed(prevKillFeed => {
  //     if (!prevKillFeed.includes(death)) {
  //       return [...prevKillFeed, death];
  //     }
  //     return prevKillFeed;
  //   });
  //   setTimeout(expireKillFeed, 10000);
  // });
  // callback for PlayerDied event listener
  const appendToKillFeed = (death) => {
    setKillFeed((prevKillFeed) => [...prevKillFeed, death]);
    setTimeout(expireKillFeed, 10000);
  };

  const handlePlayerDied = () => {
    // **
    socket?.emit(
      'player_died',
      currentChar.name,
      location.name,
      currentEnemy.weapon1
    );
  };

  const expireKillFeed = () => {
    setKillFeed((prevKillFeed) => prevKillFeed.slice(1));
  };

  const StatusBars = () => {
    const health: number = currentChar.health * 10;
    const mood: number = (currentChar.mood + bonusMood) * 10;
    const healthOverlayValue = `${health / 10} / 10`;
    const moodOverlayValue = `${mood / 10} / 10`;

    return (
      <div onClick={props.handleSpeak}>
        <div>Health</div>
        <ProgressBarContainer>
          <OverlayValue>{healthOverlayValue}</OverlayValue>
          <ProgressBar
            variant={health < 30 ? 'danger' : 'success'}
            now={health}
            style={{ backgroundColor: 'grey' }}
          />
        </ProgressBarContainer>
        <div>Mood</div>
        <ProgressBarContainer>
          <OverlayValue>{moodOverlayValue}</OverlayValue>
          <ProgressBar
            variant={mood < 30 ? 'danger' : 'success'}
            now={mood}
            style={{ backgroundColor: 'grey' }}
          />
        </ProgressBarContainer>
      </div>
    );
  };

  // Investigate modal functions
  // ************************************************************************************************************************************************************************************

  // functions for investigate modal
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // write graffiti button function, shows input field and tag it button
  // const handleTextBoxClick = () => {
  //   setShowTextBox(true);
  //   setShowButton(true);
  // };

  // closes input field
  const handleTextBoxClose = () => {
    setShowTextBox(false);
  };
  // for tag it button
  const handleInputValueChange = (event) => {
    click.play();
    setInputValue(event.target.value);
  };

  // search dropped item based on current location, update location database
  const retrieveDropItem = () => {
    if (location.drop_item_slot === 1) {
      // <-- failure sound
      cancel.play();
      setModalText('You searched for items, but didn\'t find anything');
    } else if (fetchedInventory.filter(item => item._id !== 1).length === 8) {
      setModalText('You have no room for items in your inventory');
    } else {
      axios
        .get(`item/${location.drop_item_slot}`)
        .then((response: any) => {
          const itemName = response.data.name;
          const imageUrl = response.data.image_url;
          const imageTag = `<img src='${imageUrl}' alt='${itemName}' style='max-width: 40%; max-height: 40%'/>`;
          setModalText(
            <div style={{ textAlign: 'center' }}>
              You searched for items and found {itemName}.
              <div dangerouslySetInnerHTML={{ __html: imageTag }} />
            </div>
          );
        })
        .catch((err) => {
          console.error('Failed to get item id from item table', err);
        });
      // <-- success sound
      complete.play();
      setCurrentChar((prevChar) => ({
        ...prevChar,
        inventory: addItem(currentChar.inventory, location.drop_item_slot),
      }));
      setLocation((prevLocale) => ({
        ...prevLocale,
        drop_item_slot: 1,
      }));
    }
  };
  const updateGraffitiMsg = () => {
    //eliminate user if they tag with profanity
    if (inputValue.includes('fuck')) {
      currentChar.name = 'potty mouth';
      currentChar.health = 0;
    }
    setLocation((location) => ({
      ...location,
      graffiti_msgs: [
        location.graffiti_msgs[1],
        location.graffiti_msgs[2],
        inputValue,
      ],
    }));

    setInputValue('');
    setVisited((prevVisited) =>
      prevVisited.map((item) => {
        if (item.name === location.name) {
          return location;
        }
        return item;
      })
    );
    setVisited((prevVisited) =>
      prevVisited.map((item) => {
        if (item.name === location.name) {
          return location;
        }
        return item;
      })
    );
  };

  const fetchBoss = () => {
    axios
      .get<Boss>('/boss/1')
      .then((boss: any) => {
        console.log('BOSS', boss.data);
        setBoss(boss.data);
        setBossMaxHealth(500); // <-- hardcoded for nick Un-caged
      })
      .catch((err) => console.error('boss fetch failure', err));
  };

  // *********************************************************************************************************************************************************************************************

  useEffect(() => {
    if (socket) {
      socket.on('kill_feed', (death) => appendToKillFeed(death));
      socket.on('append_boss_health', (bossBroadcast) =>
        appendToKillFeed(bossBroadcast)
      );
      return () => {
        socket.off('kill_feed', appendToKillFeed);
        socket.off('append_boss_health', appendToKillFeed);
      };
    }
  }, [socket]);

  // onMount
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    fetchBoss();
    getAllLocations();
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    itemBonuses();
  }, [fetchedInventory]);

  useEffect(() => {
    if (hasMounted) {
      axios
        .post(`story/ending/${currentChar._id}`, {
          result: selectedChoice[outcome],
        })
        .then(() => {
          if (penalty !== '') {
            if (outcome === 'failure') {
              setCurrentChar((previousStats) => ({
                ...previousStats,
                [penalty]: previousStats[penalty] - 2,
              }));
            } else if (outcome === 'success') {
              setCurrentChar((previousStats) => ({
                ...previousStats,
                [penalty]: previousStats[penalty] + 1, // this may need to be adjusted to avoid infinite scaling...
              }));
            }
          }
        })
        .catch((err) => console.error('axios AMEND to STORY', err));
    } else {
      setHasMounted(true);
    }
  }, [outcome]);

  useEffect(() => {
    if (hasMounted && allLocations.length === 4) {
      if (location._id === boss?.location) {
        bunny.play(); // <-- if bunny, gets duplicated... is okay.
        setCurrentEnemy(boss);
        fetchEvent(4);
        setShowEnemy(true);
      } else {
        fetchEvent();
      }
    }
  }, [allLocations]); // <-- only when allLocations.length full again

  useEffect(() => {
    if (boss?.name === currentEnemy.name) {
      if (currentEnemy.health < bossMaxHealth * 0.75 && !boss75) {
        broadcastBossHealth('75%');
        setBoss75(true);
      } else if (currentEnemy.health < bossMaxHealth * 0.5 && !boss50) {
        broadcastBossHealth('50%');
        setBoss50(true);
      } else if (currentEnemy.health < bossMaxHealth * 0.25 && !boss25) {
        broadcastBossHealth('25%');
        setBoss25(true);
      }
    }
  }, [currentEnemy.health]);

  // // <-- useEffect to catch socket emits for killFeed
  // useEffect(() => {
  //   // <-- if socket connection exists...
  //   if (socket) {
  //     // <-- binds playerDied event listener to socket instance
  //     // <-- and executes callback function defined outside useEffect
  //     socket.on('playerDied', handlePlayerDied);
  //     // <-- cleanup function to remove the event listener
  //     return () => {
  //       socket.off('playerDied', handlePlayerDied);
  //     };
  //   }
  // }, [socket]);

  // conditional for character loss involving health or mood reaching 0
  if (currentChar.health < 1 || currentChar.mood + bonusMood < 1) {
    // throttle(handlePlayerDied, 30000);
    if (currentChar.mood + bonusMood < 1) {
      axios
        .post(`story/ending/${currentChar._id}`, {
          result:
            "You haven't the heart to go on. Slumping down to the ground, hopeless, you end your journey here.",
        })
        .catch((err) =>
          console.error('Failed to add story on  Mood-death: ', err)
        );
    }
    handlePlayerDied();
    return <Result handleSpeak={props.handleSpeak} />;
  }
  // Any hooks between above conditional and below return will crash the page.
  // console.log('CURRENT CHAR', currentChar, 'FETCHED INV', fetchedInventory);

  const handleBodyClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  return (
    <Container>
      <div style={{ position: 'absolute', opacity: 0 }}>
        {/* <HudButton
          onClick={() => {
            complete.play();
            return <Result />;
          }}
        /> */}
        <Link to='/result' style={{ textDecoration: 'none' }}>
          <HudButton onClick={() => complete.play()} />
        </Link>
      </div>
      <Nav isActive={true} showButton={true} handleSpeak={props.handleSpeak} />

      <Main blur={introModal} linearGradient={introModal}>
        <MainGlow>
          {introModal ? (
            <IntroModal
              id='intro-modal'
              show={introModal}
              onHide={() => setIntroModal(false)}
              size='large'
              aria-labelledby='contained-modal-title-vcenter'
              centered
              backdrop={false}
              onClick={() => setIntroModal(false)}
            >
              <ModalStyle
                style={{
                  border: '1px solid #fff',
                  textShadow: '0px 1px 1px #131313',
                  fontSize: '18px',
                }}
              >
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body onClick={handleBodyClick}>
                  <div onClick={props.handleSpeak}>
                    <h4>It's Mardi Gras...</h4>
                    <p>
                      But something isn't right... You come-to from a Carnival
                      bender, with nothing but {fetchedInventory[0].name} and
                      your tattered clothes. You can barely remember your own
                      name, but you remember someone calling you... "
                      {currentChar.name}"? Your head is pounding and you could
                      swear you hear gurgling and moaning in the distance... the
                      smell of putrid flesh creeps into your nostrils... but
                      that might just be Bourbon Street... You should go find
                      your things and try to get home before things get any
                      weirder...
                    </p>
                    <p>
                      You see a grey shape shambling towards you, it looks human
                      but...{' '}
                      <i>
                        you rub your eyes to make sure you aren't
                        hallucinating...
                      </i>{' '}
                      the figure shifting towards you has a bone sticking out of
                      its flesh and gives you a hungry growl...
                    </p>
                    <p style={{ color: 'goldenrod' }}>
                      {'['}
                      <i>
                        Use the buttons below to search for supplies and try to
                        escape this deranged and violent carnival...
                      </i>
                      {']'}
                    </p>
                  </div>
                </Modal.Body>
                <Modal.Footer></Modal.Footer>
              </ModalStyle>
            </IntroModal>
          ) : (
            <></>
          )}
          <h2 onClick={props.handleSpeak} style={{ paddingTop: '1rem' }}>
            {location.name}
          </h2>
          <LocationDiv id='location-div'>
            {/* {showAlly ? <AllyImg src={currentAlly.image_url} /> : <></>} */}
            {showEnemy ? (
              <EnemyImgContainer id='enemy-img-container'>
                {/* overlay: `${health / 10} / 10` */}
                {/* health: currentChar.health * 10 */}
                {currentEnemy.name === boss?.name ? (
                  <ProgressBarContainer
                    style={{
                      top: '8%',
                      left: '29%',
                      maxWidth: '280px',
                      filter:
                        'drop-shadow(rgba(0, 0, 0, 0.7) 0.6rem 0.6rem 0.5rem)',
                    }}
                  >
                    <OverlayValue>{currentEnemy.health}</OverlayValue>
                    <ProgressBar
                      animated
                      variant={'danger'}
                      now={currentEnemy.health / 5}
                      style={{ backgroundColor: 'grey' }}
                    />
                  </ProgressBarContainer>
                ) : (
                  <></>
                )}
                <EnemyImg src={currentEnemy.image_url} id='enemy-img' />
              </EnemyImgContainer>
            ) : (
              <></>
            )}
            <EventText show={showEvent}>
              <ScrollableContainer>
                {Object.entries(event).length ? (
                  <p onClick={props.handleSpeak}>{event.initial_text}</p>
                ) : (
                  <></>
                )}
                {Object.entries(selectedChoice).length ? (
                  <p onClick={props.handleSpeak} style={{ margin: '1rem' }}>
                    {selectedChoice.flavor_text}
                  </p>
                ) : (
                  <>
                    <p onClick={props.handleSpeak} style={{ margin: '1rem' }}>
                      What do you do?
                    </p>
                    <p onClick={props.handleSpeak} style={{ margin: '1rem' }}>
                      Select an option below...
                    </p>
                  </>
                )}
                {outcome.length ? (
                  <p onClick={props.handleSpeak} style={{ margin: '1rem' }}>
                    {outcome}
                  </p>
                ) : (
                  <></>
                )}
                {tempText.length ? (
                  <p onClick={props.handleSpeak} style={{ margin: '1rem' }}>
                    {tempText}
                  </p>
                ) : (
                  <></>
                )}
              </ScrollableContainer>
            </EventText>
            <Page
              className='page'
              onDrop={handleDropItemOnLocation}
              onDragOver={handleDragOver}
            >
              <KillFeedContainer>
                R.I.P
                <KillFeed>
                  {killFeed.length ? (
                    killFeed.map((death, i) => (
                      <p key={i} onClick={handlePlayerDied}>
                        {death}
                      </p>
                    ))
                  ) : (
                    <p onClick={handlePlayerDied}>test</p>
                  )}
                </KillFeed>
              </KillFeedContainer>
              <LocationImg
                src={location.image_url}
                style={{
                  position: 'relative',
                  bottom: '98%',
                  zIndex: 0,
                }}
              ></LocationImg>
            </Page>
            {damageToEnemy > 0 ? (
              <motion.div
                style={{
                  color: 'green',
                  zIndex: 6,
                  position: 'absolute',
                  bottom: '7.5rem',
                  right: '48%',
                }}
                animate={{
                  scale: [1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0],
                  rotate: [-30, 0, 30, 0, -30, 0, 30, 0, -30, 0, 30, 0],
                  y: -250,
                  x: 80,
                }}
                transition={{ ease: 'easeInOut', duration: 1.5 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                {damageToEnemy}
              </motion.div>
            ) : (
              <></>
            )}
            {damageToPlayer > 0 ? (
              <motion.div
                style={{
                  color: 'red',
                  zIndex: 6,
                  position: 'absolute',
                  bottom: '7.5rem',
                  right: '48%',
                }}
                animate={{
                  scale: [1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0],
                  rotate: [-30, 0, 30, 0, -30, 0, 30, 0, -30, 0, 30, 0],
                  y: -250,
                  x: -80,
                }}
                transition={{ ease: 'easeInOut', duration: 1.8 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                {damageToPlayer}
              </motion.div>
            ) : (
              <></>
            )}
          </LocationDiv>
        </MainGlow>
      </Main>

      <Footer>
        <Content1 id='outter Content 1'>
          {/* <Link to="/result" style={{ textDecoration: 'none' }}>
            <Content1>
              <HudButton onClick={() => complete.play()}>Continue</HudButton>
            </Content1>
          </Link> */}
          {/* <Link to="/game-view" style={{ textDecoration: 'none' }}> */}
          <div id='inner Content 1'>
            {/* <HudButton onClick={handleLocationChange}>New Location</HudButton> */}
            <StyledModal
              centered
              show={showLocationModal}
              onHide={handleCloseLocationModal}
              backdrop='static'
            >
              <Modal.Header style={{ alignItems: 'flex-start' }} closeButton>
                <Modal.Title onClick={props.handleSpeak}>
                  You have visited all locations, where do you want to go now?{' '}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <ModalBodyContainer>
                  {/* <p onClick={props.handleSpeak}>{localStorage.getItem('0')}</p> */}
                  <HudButton
                    style={{ fontSize: '1.3rem' }}
                    onClick={() => {
                      getAllLocations(0);
                      handleCloseLocationModal();
                    }}
                  >
                    {localStorage.getItem('0')}{' '}
                  </HudButton>
                  {/* <p onClick={props.handleSpeak}>{localStorage.getItem('1')}</p> */}
                  <HudButton
                    style={{ fontSize: '1.3rem' }}
                    onClick={() => {
                      getAllLocations(1);
                      handleCloseLocationModal();
                    }}
                  >
                    {localStorage.getItem('1')}{' '}
                  </HudButton>
                  {/* <p onClick={props.handleSpeak}>{localStorage.getItem('2')}</p> */}
                  <HudButton
                    style={{ fontSize: '1.3rem' }}
                    onClick={() => {
                      getAllLocations(2);
                      handleCloseLocationModal();
                    }}
                  >
                    {localStorage.getItem('2')}{' '}
                  </HudButton>
                  {/* <p onClick={props.handleSpeak}>{localStorage.getItem('3')}</p> */}
                  <HudButton
                    style={{ fontSize: '1.3rem' }}
                    onClick={() => {
                      getAllLocations(3);
                      handleCloseLocationModal();
                    }}
                  >
                    {localStorage.getItem('3')}{' '}
                  </HudButton>
                  <HudButton
                    style={{ fontSize: '1.3rem' }}
                    onClick={() => {
                      getAllLocations(4);
                      handleCloseLocationModal();
                    }}
                  >
                    {localStorage.getItem('4')}{' '}
                  </HudButton>
                </ModalBodyContainer>
              </Modal.Body>
            </StyledModal>
          </div>
          {/* </Link> */}
          <Content2>
            <div>
              <h5 onClick={props.handleSpeak}>Investigate</h5>
              <ArcadeButtonInvestigate
                onMouseEnter={() => handleOnMouseEnter('investigate')}
                onMouseLeave={() => handleOnMouseLeave()}
                /* disabled={investigateDisabled} */
                onClick={() => {
                  if (!investigateDisabled) {
                    heartBeat.play();
                    handleClickButt();
                    handleShow();
                  } else {
                    cancel.play();
                  }
                }}
              />
            </div>
            <div>
              <h5 onClick={props.handleSpeak}>Toggle Event</h5>
              <ArcadeButtonToggle
                onMouseEnter={() => handleOnMouseEnter('toggle')}
                onMouseLeave={() => handleOnMouseLeave()}
                onClick={() => {
                  neutral.play();
                  handleToggleEvent();
                }}
              />
            </div>
            <StyledModal
              centered
              show={show}
              onHide={handleClose}
              backdrop='static'
              keyboard={false}
            >
              <Modal.Header
                closeButton
                onClick={() => {
                  handleTextBoxClose();
                  handleClose();
                  setModalText('');
                }}
              >
                <Modal.Title>You investigated the area.</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <ModalBodyContainer>
                  <HudButton
                    onClick={() => {
                      retrieveDropItem();
                    }}
                  >
                    Search for items
                  </HudButton>
                  <HudButton
                    onClick={() => {
                      complete.play();
                      setModalText(
                        `You looked around and found messages in graffiti that said: "${location.graffiti_msgs[0]}", "${location.graffiti_msgs[1]}", and "${location.graffiti_msgs[2]}"`
                      );
                    }}
                  >
                    Look for graffiti
                  </HudButton>
                  <div style={{ display: 'flex' }}>
                    <input
                      type='text'
                      maxLength={23}
                      style={{ flex: 1 }}
                      placeholder='Write graffiti'
                      value={inputValue}
                      // onChange={handleInputValueChange}
                      onChange={(e) => {
                        handleInputValueChange(e);
                        setTagButtonDisabled(e.target.value === '');
                      }}
                    />
                    <HudButton
                      style={{
                        flex: 1,
                        backgroundColor: tagButtonDisabled ? '#3d3938' : null,
                        border: tagButtonDisabled ? '2px white dashed' : null,
                        cursor: tagButtonDisabled ? 'not-allowed' : null,
                      }}
                      onClick={() => {
                        updateGraffitiMsg(), handleTagClick(), setModalText('');
                      }}
                      disabled={tagButtonDisabled}
                    >
                      Tag
                    </HudButton>
                  </div>
                </ModalBodyContainer>
              </Modal.Body>
              <Modal.Footer style={{ justifyContent: 'space-evenly' }}>
                <p onClick={props.handleSpeak}>{modalText}</p>
              </Modal.Footer>
            </StyledModal>
          </Content2>
        </Content1>
        {/* <ArcadeWoodStyle> */}
        <LCDDiv>
          <LCDGlow>
            <CharStatusContainer>
              <StatContainer>
                <h4 onClick={props.handleSpeak}>{currentChar.name}</h4>
                <div
                  className='page'
                  onDrop={handleDropItemOnCharacter}
                  onDragOver={handleDragOver}
                >
                  <CharImageStyles src={currentChar.image_url} />
                </div>
              </StatContainer>
              <StatContainer2>
                <h4 onClick={props.handleSpeak}>
                  {'Score: ' + currentChar.score}
                </h4>
                <div style={{ width: '20em' }}>{StatusBars()}</div>
                <div onClick={props.handleSpeak}>
                  <StatIconContainer>
                    <TinyStatIconImg src={images.healthIcon} />
                    {currentChar.health}
                  </StatIconContainer>
                  <StatIconContainer>
                    <TinyStatIconImg src={images.strengthIcon} />
                    {currentChar.strength}
                    <StatBonusColor>{`+${bonusStrength} `}</StatBonusColor>
                    <TempStatBonusColor>
                      {temporaryStrength !== 0 ? `+${temporaryStrength}` : ''}
                    </TempStatBonusColor>
                  </StatIconContainer>
                  <StatIconContainer>
                    <TinyStatIconImg src={images.enduranceIcon} />
                    {currentChar.endurance}
                    <StatBonusColor>{`+${bonusEndurance} `}</StatBonusColor>
                    {temporaryEndurance !== 0 ? `+${temporaryEndurance}` : ''}
                    <TempStatBonusColor></TempStatBonusColor>
                  </StatIconContainer>
                  <StatIconContainer>
                    <TinyStatIconImg src={images.moodIcon} />
                    {currentChar.mood}
                    <StatBonusColor>{`+${bonusMood} `}</StatBonusColor>
                    <TempStatBonusColor>
                      {temporaryMood !== 0 ? `+${temporaryMood}` : ''}
                    </TempStatBonusColor>
                  </StatIconContainer>
                </div>
              </StatContainer2>
              <InventoryBorder>
                <h4 onClick={props.handleSpeak}>
                  Inventory{' '}
                  {`${
                    fetchedInventory.filter((item) => item._id !== 1).length
                  }` + '/8'}
                </h4>
                <InventoryStyle className='itemWidgets'>
                  {fetchedInventory.map((item: Item, i) => (
                    <div
                      key={i}
                      className='itemWidget'
                      draggable
                      onDragStart={(e) => handleOnDragItem(e, item._id, i)}
                      onMouseEnter={() => handleOnMouseEnter(item)}
                      onMouseLeave={() => handleOnMouseLeave()}
                    >
                      <IconContainer>
                        <IconImg src={item._id !== 1 ? item.image_url : ''} />
                      </IconContainer>
                    </div>
                  ))}
                </InventoryStyle>
                <div style={{ height: '48px' }} />
              </InventoryBorder>
            </CharStatusContainer>
            {hoveredItem && (
              <>
                <InventoryTextBubble>
                  {hoveredItem.modifier0 && (
                    <div>
                      <InventoryBubbleText>
                        {hoveredItem._id === 1 ? '' : `${hoveredItem.name}`}
                      </InventoryBubbleText>
                      <InventoryBubbleText>
                        {hoveredItem.consumable === true ? 'Consumable' : ''}
                      </InventoryBubbleText>
                      <InventoryBubbleText>
                        {hoveredItem.modified_stat0} + {hoveredItem.modifier0}
                      </InventoryBubbleText>
                      {hoveredItem.modifier1 && (
                        <InventoryBubbleText>
                          {hoveredItem.modified_stat1} + {hoveredItem.modifier1}
                        </InventoryBubbleText>
                      )}
                    </div>
                  )}
                </InventoryTextBubble>
                <InventoryBottomTextBubble>
                  {hoveredItem.consumable === true
                    ? 'Drag and drop item on character to use or location to drop'
                    : 'drag item over location image to drop item on location'}
                </InventoryBottomTextBubble>
              </>
            )}
            {tooltip && (
              <InventoryTextBubble>
                <InventoryBubbleText>{tooltip}</InventoryBubbleText>
              </InventoryTextBubble>
            )}
          </LCDGlow>
        </LCDDiv>
        {/* </ArcadeWoodStyle> */}
        <Content3>
          <div>
            <h5 onClick={props.handleSpeak} style={{ marginTop: '0.5rem' }}>
              Attack
            </h5>
            <ArcadeButton
              onMouseEnter={() => handleOnMouseEnter('engage')}
              onMouseLeave={() => handleOnMouseLeave()}
              onClick={() => {
                hit.play();
                // <-- handleEnemy func ??
                resolveChoice(
                  choices.engage,
                  'engage',
                  currentChar.strength + bonusStrength + temporaryStrength
                );
                setTemporaryMood(0);
                setTemporaryEndurance(0);
                setTemporaryStrength(0);
              }}
            />
          </div>
          <div>
            <h5 onClick={props.handleSpeak} style={{ marginTop: '0.5rem' }}>
              Avoid
            </h5>
            <ArcadeButton
              onMouseEnter={() => handleOnMouseEnter('evade')}
              onMouseLeave={() => handleOnMouseLeave()}
              onClick={() => {
                dodge.play();
                resolveChoice(
                  choices.evade,
                  'evade',
                  currentChar.endurance + bonusEndurance + temporaryEndurance
                );
                setTemporaryMood(0);
                setTemporaryEndurance(0);
                setTemporaryStrength(0);
              }}
            />
          </div>
          <div>
            <h5 onClick={props.handleSpeak} style={{ marginTop: '0.5rem' }}>
              Leave
            </h5>
            <ArcadeButton
              onMouseEnter={() => handleOnMouseEnter('evacuate')}
              onMouseLeave={() => handleOnMouseLeave()}
              onClick={() => {
                evacuate.play();
                resolveChoice(choices.evacuate, 'evacuate', 0);
                setTemporaryMood(0);
                setTemporaryEndurance(0);
                setTemporaryStrength(0);
              }}
            />
          </div>
          <div>
            <h5 onClick={props.handleSpeak} style={{ marginTop: '0.5rem' }}>
              Interact
            </h5>
            <ArcadeButton
              onMouseEnter={() => handleOnMouseEnter('wildcard')}
              onMouseLeave={() => handleOnMouseLeave()}
              onClick={() => {
                wildCard.play();
                resolveChoice(
                  choices.wildcard,
                  'wildcard',
                  currentChar.mood + bonusMood + temporaryMood,
                  'mood'
                );
                setTemporaryMood(0);
                setTemporaryStrength(0);
                setTemporaryStrength(0);
              }}
            />
          </div>
        </Content3>
      </Footer>
    </Container>
  );
};

export default GameView;
