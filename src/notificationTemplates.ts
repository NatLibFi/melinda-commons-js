interface basicNotificationContext {
  text: string
}

interface basicNotificationResult {
  text: string
}

export function generateBasicNotification(basicContext: basicNotificationContext): basicNotificationResult {
  return {text: basicContext.text};
}

interface blobNotificationContext {
  profile?: string,
  id?: string,
  correlationId?: string,
  numberOfRecords?: number,
  failedRecords?: number,
  processedRecords?: number,
  created?: number,
  updated?: number,
  skipped?: number,
  error?: number
}

// Same as in utils
interface sendNotificationOpts {
  environment?: false | string,
  linkUrl?: string,
  template: string | false,
  fail?: boolean
}

interface blobNotificationResult {
  blocks: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function generateBlobNotification({
  profile = '',
  id = '',
  correlationId = '',
  numberOfRecords = 0,
  failedRecords = 0,
  processedRecords = 0,
  created = 0,
  updated = 0,
  skipped = 0,
  error = 0
}: blobNotificationContext, {environment = false, linkUrl = ''}: sendNotificationOpts): blobNotificationResult {
  return {
    'blocks': [
      {
        'type': 'header',
        'text': {
          'type': 'plain_text',
          'text': `${environment ? `${environment} - ` : ''}Record import blob: ${profile}`,
          'emoji': true
        }
      },
      {
        'type': 'divider'
      },
      {
        'type': 'rich_text',
        'elements': [
          {
            'type': 'rich_text_section',
            'elements': [
              {
                'type': 'text',
                'text': 'Id: ',
                'style': {
                  'bold': true
                }
              },
              {
                'type': 'text',
                'text': `${id}`
              }
            ]
          },
          {
            'type': 'rich_text_section',
            'elements': [
              {
                'type': 'text',
                'text': 'Correlation id: ',
                'style': {
                  'bold': true
                }
              },
              {
                'type': 'link',
                'url': `${linkUrl}/?id=${correlationId}`,
                'text': `${correlationId}`
              }
            ]
          }
        ]
      },
      {
        'type': 'rich_text',
        'elements': [
          {
            'type': 'rich_text_section',
            'elements': [
              {
                'type': 'text',
                'text': 'Transformation results',
                'style': {
                  'bold': true
                }
              }
            ]
          }
        ]
      },
      {
        'type': 'rich_text',
        'elements': [
          {
            'type': 'rich_text_list',
            'style': 'bullet',
            'indent': 1,
            'elements': [
              {
                'type': 'rich_text_section',
                'elements': [
                  {
                    'type': 'text',
                    'text': 'Number of records: '
                  },
                  {
                    'type': 'text',
                    'text': `${numberOfRecords}`
                  }
                ]
              },
              {
                'type': 'rich_text_section',
                'elements': [
                  {
                    'type': 'text',
                    'text': 'Failed records: '
                  },
                  {
                    'type': 'text',
                    'text': `${failedRecords}`
                  }
                ]
              },
              {
                'type': 'rich_text_section',
                'elements': [
                  {
                    'type': 'text',
                    'text': 'Processed records: '
                  },
                  {
                    'type': 'text',
                    'text': `${processedRecords}`
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        'type': 'rich_text',
        'elements': [
          {
            'type': 'rich_text_section',
            'elements': [
              {
                'type': 'text',
                'text': 'Process results',
                'style': {
                  'bold': true
                }
              }
            ]
          }
        ]
      },
      {
        'type': 'rich_text',
        'elements': [
          {
            'type': 'rich_text_list',
            'style': 'bullet',
            'indent': 1,
            'elements': [
              {
                'elements': [
                  {
                    'text': 'Created records: ',
                    'type': 'text'
                  },
                  {
                    'text': `${created}`,
                    'type': 'text'
                  }
                ],
                'type': 'rich_text_section'
              },
              {
                'elements': [
                  {
                    'text': 'Updated records: ',
                    'type': 'text'
                  },
                  {
                    'text': `${updated}`,
                    'type': 'text'
                  }
                ],
                'type': 'rich_text_section'
              },
              {
                'elements': [
                  {
                    'text': 'Skipped records: ',
                    'type': 'text'
                  },
                  {
                    'text': `${skipped}`,
                    'type': 'text'
                  }
                ],
                'type': 'rich_text_section'
              },
              {
                'elements': [
                  {
                    'text': 'Error records: ',
                    'type': 'text'
                  },
                  {
                    'text': `${error}`,
                    'type': 'text'
                  }
                ],
                'type': 'rich_text_section'
              }
            ]
          }
        ]
      },
      {
        'type': 'divider'
      }
    ]
  };
}
