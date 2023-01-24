import { CommandLanguageCompiler } from "./compiler.js";

function vector3wAfter(after, optional) {
	return {
		'<v~?>': {
			type: 'list',
			optional: optional,
			next: {
				'<v~?>': {
					type: 'list',
					next: {
						'<v~?>': {
							type: 'list',
							next: after
						}
					}
				}
			}
		},
		'<v^?>': {
			type: 'list',
			optional: optional,
			next: {
				'<v^?>': {
					type: 'list',
					next: {
						'<v^?>': {
							type: 'list',
							next: after
						}
					}
				}
			}
		}
	}
}
function vector2wAfter(after, optional) {
	let vector3 = vector3wAfter(null, optional);
	vector3['<v~?>'].next['<v~?>'].next = after;
	vector3['<v^?>'].next['<v^?>'].next = after;
	return vector3;
}
function vector5wAfter(after, optional3, optional2) {
	return vector3wAfter(vector2wAfter(after, optional2),optional3);
}
//

export const MinecraftFunction = new CommandLanguageCompiler(
	{
	'<targets?>': /^((@[eaprs](\[.*\])?)|([^@]+))$/,
	'<v~?>': /^\~?([+-]?([0-9]*[.])?[0-9]+)?$/,
	'<v^?>': /^\^?([+-]?([0-9]*[.])?[0-9]+)?$/,
	'<??>': /./,
	'<range?>': /^([+-]?\d+)?(\.\.)?([+-]?\d+)?$/,
	'<datatype?>': /^(byte|double|float|int|long|short)$/,
	'<number?>': /^([+-]?\d+)$/,
	'<float?>': /^([+-]?(\d+)?)?(\.)?(\d+)?$/,
	'<comment?>': /\#/,
	'<logicalOperator?>': /^([<>]?=?)$/,
	'<arithmeticOperator?>': /^([+\-*/%]?=|[<>]|\><)$/,
	'<namedColor?>': /^(blue|green|pink|purple|red|white|yellow)$/,
	'<namedStyle?>': /^(notched_6|notched_10|notched_12|notched_20|progress)$/,
	'<mode?>': /^(survival|creative|adventure|spectator)$/,
	'<difficulty?>': /^(easy|hard|normal|peaceful)$/,
	'<id?>': /^[-+._A-Za-z0-9]+$/,
	'<boolean?>': /^(true|false)$/,

	'<swizzle-xyz?>': token => {
		if (!isCombinationOf(token, 'xyz')) {
			throw new TypeError(`axes '${token}' is not allowed. Expected a combination of xyz.`);
		}
		
		return true;
	},
	'<uuid?>': function(token) {
		if (isUUID(token)) return true;

		throw TypeError(token + ' is not a valid UUID')
	},


	/* EXECUTE */		
	'': '',
},
{
	// total of 79 (without comment)

	'<comment?>': {
		type: 'comment',
	},
	'execute': {
		type: 'keyword',
		next: {
			'align': {
				type: 'seckeyword',
				next: {
					'<swizzle-xyz?>': {
						type: 'list',
						next: '<...>'
					}
				}
			},
			'anchored': {
				type: 'seckeyword',
				next: {
					'eyes|feet': {
						type: 'list',
						next: '<...>'
					}
				}
			},
			'as|at': {
				type: 'seckeyword',
				next: {
					'<targets?>': {
						type: 'selector',
						next: '<...>'
					}
				}
			},
			'facing': {
				type: 'seckeyword',
				next: {
					...vector3wAfter('<...>'),
					'entity': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: {
									'eyes|feet': {
										type: 'list',
										next: '<...>'
									}
								}
							}
						}
					}
				}
			},
			'if|unless': {
				type: 'seckeyword',
				next: {
					'block': {
						type: 'thrkeyword',
						next: vector3wAfter({
								'<??>': {
									type: 'resource_location',
									next: '<...>'
							}})
					},
					'blocks': {
						type: 'thrkeyword',
						next: vector3wAfter(vector3wAfter(vector3wAfter({
								'<??>': {
									type: 'resource_location',
									next: '<...>'
							}})))
					},
					'data': {
						type: 'thrkeyword',
						next: {
							'block': {
								type: 'thrkeyword',
								next: vector3wAfter({
									'<??>':{
										type: 'special',
										next: '<...>'
									}
								})
							},
							'entity': {
								type: 'thrkeyword',
								next: {'<targets?>':{
									type: 'selector',
									next: {
										'<??>':{
											type: 'special',
											next: '<...>'
										}
									}
								}}
							},
							'storage': {
								type: 'thrkeyword',
								next: {'<??>':{
									type: 'resource_location',
									next: {
										'<??>':{
											type: 'special',
											next: '<...>'
										}
									}
								}}
							}
						}
					},
					'entity': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: '<...>'
						}}
					},
					'predicate': {
						type: 'thrkeyword',
						next: {
							'<??>': {
								type: 'resource_location',
								next: '<...>'
						}}
					},
					'score': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: {
									'<??>': {
										type: 'resource_location',
										next: {
											'<logicalOperator?>': {
												type: 'delimiter',
												next: {
													'<targets?>': {
														type: 'selector',
														next: {
															'<??>': {
																type: 'resource_location',
																next: '<...>'
															}
														}
													}
												}
											},
											'matches': {
												type: 'thrkeyword',
												next: {'<range?>':{
													type: 'value',
													flag: 'range',
													next: '<...>'
												}}
											}
										},
									}
								}
						}}
					},
				}
			},
			'in': {
				type: 'seckeyword',
				next: {
					'<??>': {
						type: 'resource_location',
						next: '<...>'
					}
				}
			},
			'run': {
				type: 'delimiter',
				next: {
					'<?>': '<?>'
				}
			},
			'positioned': {
				type: 'seckeyword',
				next: {
					'as': {
						type: 'thrkeyword',
						next: {
							'<targets?>':{
								type: 'selector',
								next: '<...>'
							}
						}
					},
					...vector3wAfter('<...>'),
				}
			},
			'rotated': {
				type: 'seckeyword',
				next: {
					'as': {
						type: 'thrkeyword',
						next: {
							'<targets?>':{
								type: 'selector',
								next: '<...>'
							}
						}
					},
					...vector2wAfter('<...>'),
				}
			},
			'store': {
				type: 'seckeyword',
				next: {
					'success|result': {
						type: 'thrkeyword',
						next: {
							'block': {
								type: 'thrkeyword',
								next: vector3wAfter({'<??>': {
										type: 'special',
										next: {'<datatype?>': {
												type: 'value',
												next: {'<float?>':{
													type: 'value',
													next: '<...>'
												}}
											}}
									}})
							},
							'bossbar': {
								type: 'thrkeyword',
								next: {
									'<??>': {
										type: 'resource_location',
										next: {'value|max':{
											type: 'value',
											next: '<...>'
										}}
									}
								}
							},
							'entity': {
								type: 'thrkeyword',
								next: {
									'<targets?>': {
										type: 'selector',
										next: {'<??>':{
											type: 'special',
											next: {'<datatype?>': {
												type: 'value',
												next: {'<float?>':{
													type: 'value',
													next: '<...>'
												}}
											}}
										}}
									}
								}
							},
							'score': {
								type: 'thrkeyword',
								next: {
									'<targets?>': {
										type: 'selector',
										next: {'<??>':{
											type: 'resource_location',
											next: '<...>'
										}}
									}
								}
							},
							'storage': {
								type: 'thrkeyword',
								next: {
									'<??>': {
										type: 'resource_location',
										next: {'<??>':{
											type: 'special',
											next: {'<datatype?>': {
												type: 'value',
												next: {'<float?>':{
													type: 'value',
													next: '<...>'
												}}
											}}
										}}
									}
								}
							},
						}
					}
				}
			}
		}
	},
	// /\s+'.+': \{\n\s+type: "keyword"\n\s+\}/,
	'advancement': {
		type: "keyword",
		next: {
			'grant|revoke': {
				type: 'seckeyword',
				next: {'<targets?>': {
						type: 'selector',
						next: {
							'everything': {
								type: 'thrkeyword',
								
							},
							'only': { // ... only <advancement> [<criterion>]
								type: 'thrkeyword',
								next: {'<??>':{
									type: 'resource_location',
									next: {'<??>':{
										type: 'resource_location',
										optional: true,
									}},
								}}
							},
							'from|through|until': {
								type: 'thrkeyword',
								next: {'<??>':{
									type: 'resource_location',
									
								}}
							},
						}
					}}
			}
		}
	}, 
	'attribute': {
		type: "keyword",
		next: {'<targets?>': {
				type: 'selector',
				next: {'<??>':{
					type: 'resource_location',
					next: {
						'get': {
							type: 'thrkeyword',
							next: {'<float?>': {
									type: 'value',
									optional: true,
									
								}}
						},
						'base': {
							type: 'thrkeyword',
							next: {'get|set': {
									type: 'thrkeyword',
									next: {'<float?>': {
											type: 'value',
											optional: true,
											
										}}
								}}
						},
						'modifier': {
							type: 'thrkeyword',
							next: {
								'add': {
									type: 'thrkeyword',
									next: {'<uuid?>':{
										type: 'special',
										next: {'<??>':{
											type: 'variable',
											next: {'<float?>':{
												type: 'value',
												next: {'add|multiply|multiply_base':{
													type: 'value',
													
												}}
											}}
										}}
									}}
								},
								'remove': {
									type: 'thrkeyword',
									next: {'<uuid?>':{
										type: 'special',
										
									}}
								},
								'value': {
									type: 'thrkeyword',
									
									next: {'get': {
										type: 'thrkeyword',
										next: {'<uuid?>':{
											type: 'special',
											next: {'<float?>':{
												type: 'value',
												
											}}
										}}
									}}
								},
							}	
						},
					}
				}}
			}}
	}, 
	'ban|ban-ip|kick': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			next: {'<??>':{
				
				optional: true,
				type: 'special'
			}}
		}}
	}, 
	'banlist': {
		type: "keyword",
		next: {'ips|players':{
			type: 'seckeyword',
			optional: true,
			
		}
		}
	}, 
	'bossbar': {
		type: "keyword",
		next: {
			'add': {
				type: 'seckeyword',
				next: {'<id?>':{
					type: 'resource_location',
					next: {'<??>':{
						type: 'value',
						
					}}
				}}
			},
			'get': {
				type: 'seckeyword',
				next: {'<id?>':{
					type: 'resource_location',
					next: {'max|players|value|visible':{
						type: 'value',
						
					}}
				}}
			},
			'list': {
				type: 'seckeyword',
			},
			'remove': {
				type: 'seckeyword',
				next: {'<id?>':{
					type: 'resource_location',
					
				}}
			},
			'set': {
				type: 'seckeyword',
				next: {'<id?>':{
						type: 'resource_location',
						next: {
							'color': {
								type: 'thrkeyword',
								next: {'<namedColor?>':{
									type: 'value',
									flag: 'color',
									
								}}
							},
							'max|value': {
								type: 'thrkeyword',
								next: {'<number?>':{
									type: 'value',
									flag: 'color',
									
								}}
							},
							'name': {
								type: 'thrkeyword',
								next: {'<??>':{
									type: 'value',
									
								}}
							},
							'players': {
								type: 'thrkeyword',
								next: {'<targets?>':{
									type: 'selector',
									
									optional: true
								}}
							},
							'style': {
								type: 'thrkeyword',
								next: {'notched_6|notched_10|notched_12|notched_20|progress':{
									type: 'value',
									flag: 'bossbar_style',
									
								}}
							},
							'visible': {
								type: 'thrkeyword',
								next: {'<boolean?>':{
									type: 'value',
									flag: 'color',
									
								}}
							},
						}
				}}
			},
		}
	}, 
	'clear': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			optional: true,
			next: {'<??>':{
				type: 'resource_location',
				optional: true,
				next: {'<number?>':{
					type: 'value',
					
					optional: true
				}}
			}}
		}}
	}, 
	'clone': {
		type: "keyword",
		next: vector3wAfter(vector3wAfter(vector3wAfter({'replace|masked':{
			type: 'seckeyword',
			optional: true,
			next: {'force|move|normal':{
				type: 'thrkeyword',
				optional: true,
				
			}},
		}})))
	}, 
	'data': {
		type: "keyword"
	}, 
	'datapack': {
		type: "keyword",
		next: {
			'disable': {
				type: 'seckeyword',
				next: {'<id?>':{
					type: 'resource_location',
					
				}}
			},
			'enable': {
				type: 'seckeyword',
				next: {'<id?>':{
					type: 'resource_location',
					next: {
						'first|last': {
							type: 'thrkeyword',
							optional: true,
							
						},
						'before|after': {
							type: 'thrkeyword',
							optional: true,
							next: {'<id?>':{
								
								type: 'resource_location'
							}}
						}
					}
				}}
			},
			'list': {
				type: 'seckeyword',
				next: {'available|enabled':{
					optional: true,
					
					type: 'thrkeyword'
				}}
			}
		}
	}, 
	'debug': {
		type: "keyword",
		next: {
			'start|stop': {
				type: 'seckeyword',
				
			},
			'function': {
				type: 'seckeyword',
				next: {'<??>':{
					type: 'resource_location',
					
				}}
			}
		}
	}, 
	'defaultgamemode': {
		type: "keyword",
		next: {'<mode?>':{
			type: 'value',
			
		}}
	}, 
	'deop|op': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			
		}}
	}, 
	'difficulty': {
		type: "keyword",
		next: {'<difficulty?>':{
			type: 'value',
			
			optional: true
		}}
	}, 
	'effect': {
		type: "keyword",
		next: {
			'clear': {
				type: 'seckeyword',
				next: {'<targets?>':{
					type: 'selector',
					optional: true,
					next: {'<??>':{
						type: 'resource_location',
						optional: true,
						
					}}
				}}
			},
			'give': {
				type: 'seckeyword',
				next: {'<targets?>':{
					type: 'selector',
					next: {'<??>':{
						type: 'resource_location',
						next: {'<number?>':{
							type: 'value',
							optional: true,
							next:{'<number?>':{
								type: 'value',
								flag: 'single_range',
								optional: true,
								next: {'<boolean?>':{
									type: 'value',
									optional: true,
									
								}}
							}}
						}}
					}}
				}}
			},
		}
	}, 
	'enchant': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			next: {'<??>':{
				type: 'resource_location',
				next: {'<number?>':{
					optional: true,
					type: 'value',
					
				}}
			}}
		}}
	}, 
	'experience|xp': {
		type: "keyword",
		next: {
			'add|set': {
				type: 'seckeyword',
				next: {'<targets?>':{
					type: 'selector',
					next: {'<number?>':{
						type: 'value',
						next: {'levels|points':{
							optional:true,
							
							type: 'thrkeyword'
						}}
					}}
				}}
			},
			'query': {
				type: 'seckeyword',
				next: {'<targets?>':{
					type: 'selector',
					next: {'levels|points':{
						
						type: 'thrkeyword'
					}}
				}}
			}
		}
	}, 
	'fill': {
		type: "keyword",
		next: vector3wAfter(vector3wAfter({'<??>':{
			type: 'resource_location',
			next: {
				'destroy|hollow|keep|outline': {
					type: 'thrkeyword',
					optional: true,
					
				},
				'replace': {
					optional: true,
					type: 'thrkeyword',
					next: {'<??>':{
						type: 'resource_location',
						optional: true,
						
					}},
				}
			}
		}}))
	}, 
	'forceload': {
		type: "keyword",
		next: {
			'add': {
				type: 'seckeyword',
				next: vector3wAfter(vector3wAfter('', true)),
			},
			'remove': {
				type: 'seckeyword',
				next: {
					...vector3wAfter(vector3wAfter('', true)),
					'all': {
						type: 'thrkeyword',
						
					}
				},
			},
			'query': {
				type: 'seckeyword',
				next: vector3wAfter('', true),
			}
		}
	}, 
	'function': {
		type: "keyword",
		next: {'<??>':{
			type: 'resource_location',
			
		}}
	}, 
	'gamemode': {
		type: "keyword",
		next: {'<mode?>': {
			type: 'seckeyword',
			next: {'<targets?>': {
				optional: true,
				
				type: 'selector'
			}}
		}}
	}, 
	'gamerule': {
		type: "keyword",
		next: {'<??>':{
			type: 'resource_location',
			next: {'<boolean?>':{
				type: 'value',
				optional: true,
				
			}}
		}}
	}, 
	'give': {
		type: "keyword",
		next: {'<targets?>':{
			type: "seckeyword",
			next: {'<??>':{
				type: "resource_location",
				next: {'<number?>':{
					optional: true,
					type: 'value',
					
				}}
			}}
		}}
	}, 
	'help': {
		type: "keyword",
		next: {"<??>":{
			optional: true,
			
			type: 'seckeyword'
		}}
	}, 
	'item': {
		type: "keyword"
	}, 
	'jfr|perf': {
		type: "keyword",
		next: {'start|stop':{
			type: 'seckeyword',
			
		}}
	},
	'kill|pardon|pardon-ip': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			
		}}
	}, 
	'list': {
		type: "keyword",
		next: {'uuids':{
			type: 'seckeyword',
			optional: true,
			
		}}
	}, 
	'locate': {
		type: "keyword",
		next: {'structure|biome|poi':{
			type: 'seckeyword',
			next: {'<??>':{
				type: 'resource_location',
				
			}}
		}}
	}, 
	'locateboime': {
		type: "keyword",
		next: {'<??>': {
			type: 'resource_location',
			
		}}
	}, 
	'loot': {
		type: "keyword"
	}, 
	'me|say': {
		type: "keyword",
		next: {'<??>':{
			type: 'value',
			
		}}
	}, 
	'particle': {
		type: "keyword"
	}, 
	'place': {
		type: "keyword"
	}, 
	'placesound': {
		type: "keyword"
	}, 
	'publish': {
		type: "keyword",
		next: {'<number?>':{
			type: 'value',
			
		}}
	}, 
	'recipe': {
		type: "keyword"
	}, 
	'save-all|save-off|save-on|reload|seed|stop': {
		type: "keyword",
		
	}, 
	'schedule': {
		type: "keyword"
	}, 
	'scoreboard': {
		type: "keyword",
		next: {
			'objectives': {
				type: "seckeyword",
				next: {
					"list": {
						type: "thrkeyword",
					},
					"add": {
						type: "thrkeyword",
						next: {
							"<??>": {
								type: "special",
								next: {
									"<??>": {
										type: "resource_location",
										next: {"<??>": {
											type: "value",
											optional: true
										}}
									}
								}
							}
						}
					},
					"remove": {
						type: "thrkeyword",
						next: {
							"<??>": {
								type: "special"
							}
						}
					},
					"setdisplay": {
						type: "thrkeyword",
						next: {
							"<??>": {
								type: "value",
								next: {
									"<??>": {
										type: "special",
										next: {"<??>": {
											type: "value",
											optional: true
										}}
									}
								}
							}
						}
					},
					"modify": {
						type: "thrkeyword",
					},
				}
			},
			'players': {
				type: 'seckeyword',
				next: {
					'get|reset|enable': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: {
									"<??>": {
										type: "special"
									}
								}
							}
						}
					},
					'set|add|remove': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: {
									"<??>": {
										type: "special",
										next: {
											'<number?>': {
												type: 'value'
											}
										}
									}
								}
							}
						}
					},
					'operation': {
						type: 'thrkeyword',
						next: {
							'<targets?>': {
								type: 'selector',
								next: {
									"<??>": {
										type: "special",
										next: {
											'<arithmeticOperator?>': {
												type: 'delimiter',
												next: {
													'<targets?>': {
														type: 'selector',
														next: {
															"<??>": {
																type: "special",
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					},

					
				}
			}
		}
	}, 
	'setblock': {
		type: "keyword"
	}, 
	'setidletimeout': {
		type: "keyword",
		next: {'<number?>':{
			
			type: 'value'
		}}
	}, 
	'setworldspawn': {
		type: "keyword",
		next: vector5wAfter('',true,true)
	}, 
	'spawnpoint': {
		type: "keyword",
		next: {'<targets?>':{
			type: 'selector',
			next: vector5wAfter('',true,true)
		}}
	}, 
	'spectate': {
		type: "keyword",
		next: {'<targets?>': {
			type: 'selector',
			optional: true,
			next: {'<targets?>': {
				type: 'selector',
				optional: true,
				
			}}
		}}
	}, 
	'spreadplayers': {
		type: "keyword"
	}, 
	'stopsound': {
		type: "keyword"
	}, 
	'summon': {
		type: "keyword"
	},
	'tag': {
		type: "keyword"
	}, 
	'team': {
		type: "keyword"
	}, 
	'tellraw': {
		type: "keyword"
	}, 
	'time': {
		type: "keyword"
	}, 
	'title': {
		type: "keyword"
	}, 
	'tm|teammsg': {
		type: "keyword"
	}, 
	'tp|teleport': {
		type: "keyword"
	}, 
	'trigger': {
		type: "keyword"
	}, 
	'w|tell|msg': {
		type: "keyword",
		next: {'<targets?>':{
			type: "selector",
			next: {'<??>':{
				type: "value",
				
			}}
		}}
	}, 
	'warden_spawn_tracker': {
		type: "keyword"
	}, 
	'weather': {
		type: "keyword"
	}, 
	'whitelist': {
		type: "keyword"
	}, 
	'worldborder': {
		type: "keyword"
	},
}
);
